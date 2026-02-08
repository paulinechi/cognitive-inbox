import whisper
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

_model = None

def get_whisper_model():
    global _model
    if _model is None:
        logger.info("Loading Whisper model (base)...")
        _model = whisper.load_model("base")
        logger.info("Whisper model loaded successfully")
    return _model

def transcribe_audio(audio_bytes: bytes, mime_type: str = None) -> str:
    try:
        model = get_whisper_model()
        
        extension = ".m4a"
        if mime_type:
            if "mp3" in mime_type:
                extension = ".mp3"
            elif "wav" in mime_type:
                extension = ".wav"
            elif "m4a" in mime_type or "mp4" in mime_type:
                extension = ".m4a"
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as temp_audio:
            temp_audio.write(audio_bytes)
            temp_audio_path = temp_audio.name
        
        try:
            result = model.transcribe(temp_audio_path)
            transcription = result["text"].strip()
            return transcription
        finally:
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
    
    except Exception as e:
        logger.error(f"Error transcribing audio with Whisper: {e}")
        return ""

