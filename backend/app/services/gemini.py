import logging
import json
import typing_extensions as typing
from app.models import MemoProcessed, MemoType

from google import genai
from google.genai import types as genai_types

logger = logging.getLogger(__name__)

# Pre-compute case-insensitive lookup map to avoid re-creating it on every request
TYPE_MAP = {t.value.lower(): t for t in MemoType}

_client: genai.Client | None = None


def get_client() -> genai.Client | None:
    """Returns a configured Gemini client, or None if no API key is set."""
    global _client
    if _client is not None:
        return _client

    from ..config import get_settings
    settings = get_settings()

    if not settings.GOOGLE_API_KEY:
        logger.warning("Warning: GOOGLE_API_KEY not found in environment variables")
        return None

    _client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    return _client

class MemoAnalysis(typing.TypedDict):
    memo_types: list[str]
    summary: str
    action_items: list[str]
    tags: list[str]
    emotional_tone: str

LANGUAGE_NAMES = {
    "en": "English",
    "zh": "Chinese (Simplified)",
}


def analyze_content(
    text_input: str | None = None,
    file_data: bytes | None = None,
    mime_type: str | None = None,
    available_tags: list[str] | None = None,
    preferred_language: str | None = None
) -> MemoProcessed:
    """
    Analyzes multimodal input using Gemini and returns a structured MemoProcessed object.

    Args:
        text_input: Optional text string
        file_data: Raw bytes of the file (audio or image)
        mime_type: MIME type of the file (e.g., 'audio/mp3', 'image/jpeg')
        available_tags: List of custom user tags/collections to consider.
                       Defaults to None (treated as empty list).
    """
    if available_tags is None:
        available_tags = []

    client = get_client()
    if client is None:
        logger.error("AI - Failed to configure Gemini")
        # Fail gracefully with a safe default
        return MemoProcessed(
            original_input=text_input or "",
            extracted_text=text_input or "",
            memo_types=[MemoType.OTHER],
            summary="API configuration failed.",
            confidence_score=0.0
        )

    from ..config import get_settings
    settings = get_settings()
    model_name = settings.GEMINI_MODEL_NAME

    logger.info(f"AI - Using model: {model_name}")

    try:
        # Combine default collections from config with user-created collections (passed as tags)
        base_types = settings.DEFAULT_COLLECTIONS
        combined_types = list(base_types)
        for t in available_tags:
            if t not in combined_types:
                combined_types.append(t)

        # Initialize prompt as a fresh list for every request
        prompt_parts = []
        prompt_parts.append("You are a helpful cognitive assistant. Analyze the following user input.")
        prompt_parts.append(f"Categorize the input into ONE primary type from this allowed list: {', '.join(combined_types)}. This matches the user's collections.")

        prompt_parts.append("Generate a list of free-form, descriptive 'tags' (keywords/topics) that characterize the content. These are successful soft tags.")

        prompt_parts.append("Extract any specific, actionable tasks as 'action_items'. If none, return an empty list.")

        prompt_parts.append("Extract a CONCISE summary (max 5 words) and the emotional tone.")

        fallback_language = LANGUAGE_NAMES.get(preferred_language or "en", "English")
        prompt_parts.append(
            "Write the summary, tags, and action_items in the SAME LANGUAGE as the user's input. "
            f"If the input language is unclear (e.g. an image without text), use {fallback_language}. "
            "The memo type must always be copied verbatim from the allowed list above. "
            "Always report emotional_tone in English (e.g. Neutral, Happy, Stressed)."
        )

        prompt_parts.append("If the input is an image, describe it efficiently and extract meaningful text or intent.")
        prompt_parts.append("Return the response in JSON format.")

        # Add current date context
        from datetime import datetime
        current_date = datetime.now().strftime("%B %d, %Y")
        prompt_parts.append(f"Today's date: {current_date}. Use this for temporal references.")

        if text_input:
            prompt_parts.append(f"User Input: {text_input}")

        if file_data and mime_type:
            prompt_parts.append(genai_types.Part.from_bytes(data=file_data, mime_type=mime_type))
            if "audio" in mime_type:
                prompt_parts.append("Transcribe the audio and then analyze it.")
            elif "image" in mime_type:
                prompt_parts.append("Analyze this image.")

        response = client.models.generate_content(
            model=model_name,
            contents=prompt_parts,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=MemoAnalysis,
            ),
        )

        logger.debug(f"Raw AI Response: {response.text}")
        result = json.loads(response.text)

        raw_types = result.get("memo_types", [])
        if not isinstance(raw_types, list):
            raw_types = [raw_types]

        final_types = []
        for t in raw_types:
            if not isinstance(t, str):
                continue
            cleaned_t = t.strip()
            # Try to match to Enum if possible (for backward compatibility)
            matched_enum = MemoType.from_string(cleaned_t)
            if matched_enum != MemoType.OTHER:
                final_types.append(matched_enum)
            elif cleaned_t in combined_types:
                # This matches a custom collection created by the user
                final_types.append(cleaned_t)

        if not final_types:
            final_types = [MemoType.OTHER]

        return MemoProcessed(
            original_input=text_input or f"[{mime_type}]",
            extracted_text=text_input or f"[{mime_type} Processed]",
            memo_types=final_types,
            summary=result.get("summary", ""),
            action_items=result.get("action_items", []),
            tags=result.get("tags", []),
            emotional_tone=result.get("emotional_tone", "Neutral"),
            confidence_score=0.9
        )

    except Exception as e:
        # Handle quota errors gracefully without alarming tracebacks
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower():
            logger.warning(f"AI - Quota exceeded: {error_str.split('[')[0].strip()}")
        else:
            # Unexpected errors should show full traceback for debugging
            logger.error(f"AI - Unexpected error calling Gemini: {e}", exc_info=True)

        return MemoProcessed(
            original_input=text_input or "",
            extracted_text=text_input or "",
            memo_types=[MemoType.OTHER],
            summary=text_input if text_input else "Could not process content",
            confidence_score=0.0
        )
