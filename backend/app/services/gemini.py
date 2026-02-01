import logging
import google.generativeai as genai
import os
import json
import typing_extensions as typing
from app.models import MemoProcessed, MemoType, MemoInput

logger = logging.getLogger(__name__)

def configure_genai():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("Warning: GOOGLE_API_KEY not found in environment variables")
        return False
    
    logger.info(f"AI - Configuring Gemini API (Key length: {len(api_key)})")
    genai.configure(api_key=api_key)
    return True

class MemoAnalysis(typing.TypedDict):
    memo_type: str
    summary: str
    action_items: list[str]
    tags: list[str]
    emotional_tone: str

def analyze_content(text_input: str = None, file_data: bytes = None, mime_type: str = None) -> MemoProcessed:
    """
    Analyzes multimodal input using Gemini and returns a structured MemoProcessed object.
    
    Args:
        text_input: Optional text string
        file_data: Raw bytes of the file (audio or image)
        mime_type: MIME type of the file (e.g., 'audio/mp3', 'image/jpeg')
    """
    if not configure_genai():
        logger.error("AI - Failed to configure Gemini")
        return MemoProcessed(
            original_input=text_input or "",
            extracted_text=text_input or "",
            memo_type=MemoType.OTHER,
            summary="API configuration failed.",
            confidence_score=0.0
        )
    
    # Prefer lite for free tier stability
    model_name = 'gemini-2.0-flash'
    logger.info(f"AI - Using model: {model_name}")
    model = genai.GenerativeModel(model_name)
    
    prompt_parts = [
        "You are a helpful cognitive assistant. Analyze the following user input.",
        "Categorize it into one of these types: Idea, Task, Wishlist, Reflection, Insight, Other.",
        "Extract a concise summary, any action items, relevant tags, and the emotional tone.",
        "If the input is an image, describe it efficiently and extract meaningful text or intent.",
        "Return the response in JSON format.",
    ]
    
    if text_input:
        prompt_parts.append(f"User Input: {text_input}")
    
    if file_data and mime_type:
        prompt_parts.append({
            "mime_type": mime_type,
            "data": file_data
        })
        if "audio" in mime_type:
             prompt_parts.append("Transcribe the audio and then analyze it.")
        elif "image" in mime_type:
             prompt_parts.append("Analyze this image.")

    try:
        response = model.generate_content(
            prompt_parts,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=MemoAnalysis
            )
        )
        
        result = json.loads(response.text)
        
        try:
            m_type = MemoType(result.get("memo_type", "Other"))
        except ValueError:
            m_type = MemoType.OTHER
            
        return MemoProcessed(
            original_input=text_input or f"[{mime_type}]",
            extracted_text=text_input or f"[{mime_type} Processed]", 
            memo_type=m_type,
            summary=result.get("summary", ""),
            action_items=result.get("action_items", []),
            tags=result.get("tags", []),
            emotional_tone=result.get("emotional_tone", "Neutral"),
            confidence_score=0.9
        )
        
    except Exception as e:
        logger.error(f"AI - Error calling Gemini: {e}")
        return MemoProcessed(
            original_input=text_input or "",
            extracted_text=text_input or "",
            memo_type=MemoType.OTHER,
            summary=text_input if text_input else "Could not process content",
            confidence_score=0.0
        )
