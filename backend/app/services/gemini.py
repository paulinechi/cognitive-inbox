import google.generativeai as genai
import os
import json
import typing_extensions as typing
from app.models import MemoProcessed, MemoType, MemoInput

def configure_genai():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Warning: GOOGLE_API_KEY not found in environment variables")
        return False
    genai.configure(api_key=api_key)
    return True

class MemoAnalysis(typing.TypedDict):
    memo_type: str
    summary: str
    action_items: list[str]
    tags: list[str]
    emotional_tone: str

def analyze_content(text_input: str = None, file_data: bytes = None, mime_type: str = None, available_tags: list[str] = []) -> MemoProcessed:
    """
    Analyzes multimodal input using Gemini and returns a structured MemoProcessed object.
    
    Args:
        text_input: Optional text string
        file_data: Raw bytes of the file (audio or image)
        mime_type: MIME type of the file (e.g., 'audio/mp3', 'image/jpeg')
        available_tags: List of custom user tags/collections to consider
    """
    configure_genai()
    
    model = genai.GenerativeModel('gemini-flash-latest')
    
    # Construct the allowed tags string
    base_tags = ["#Work", "#Personal", "#Urgent", "#Learning", "#Health", "#Finance", "#Home", "#Tech", "#Creative"]
    # Add user custom tags if provided (formatted with # if missing)
    custom_tags = [tag if tag.startswith("#") else f"#{tag}" for tag in available_tags]
    all_tags = list(set(base_tags + custom_tags))
    tags_str = ", ".join(all_tags)

    prompt_parts = [
        "You are a helpful cognitive assistant. Analyze the following user input.",
        f"Categorize it into exactly one of these types: Idea, Task, Wishlist, Reflection, Insight, Other, OR one of these custom user collections: {', '.join(available_tags)}.",
        "Extract a concise, direct, and imperative summary (e.g., 'Buy eggs', 'Refactor code'). Avoid 'Reminder to...' or 'Note about...'.",
        "If the input is an image, describe it efficiently and extract meaningful text or intent.",
        f"Assign strictly relevant tags from this allowed list only: {tags_str}. Do not invent new tags.",
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
        
        # Use the raw string from AI, or default to Other
        m_type = result.get("memo_type", "Other")
            
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
        print(f"Error calling Gemini: {e}")
        return MemoProcessed(
            original_input=text_input or "",
            extracted_text=text_input or "",
            memo_type=MemoType.OTHER,
            summary=text_input if text_input else "Could not process content",
            confidence_score=0.0
        )
