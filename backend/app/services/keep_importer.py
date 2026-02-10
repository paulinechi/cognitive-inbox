import zipfile
import json
import logging
import uuid
import shutil
import os
import mimetypes
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import UploadFile
from ..models import Memo, MemoType, MemoModel
from ..services.memo_service import MemoService
from html.parser import HTMLParser
import re

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/uploads")


def ensure_upload_dir() -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    return UPLOAD_DIR

class HTMLToMarkdownConverter(HTMLParser):
    """Simple HTML to Markdown converter for Google Keep notes."""
    def __init__(self):
        super().__init__()
        self.markdown = []
        self.current_tag = None
        
    def handle_starttag(self, tag, attrs):
        if tag == 'b' or tag == 'strong':
            self.markdown.append('**')
        elif tag == 'i' or tag == 'em':
            self.markdown.append('*')
        elif tag == 'a':
            self.current_tag = 'a'
            for attr in attrs:
                if attr[0] == 'href':
                    self.markdown.append(f'[')
        elif tag == 'br':
            self.markdown.append('\n')
            
    def handle_endtag(self, tag):
        if tag == 'b' or tag == 'strong':
            self.markdown.append('**')
        elif tag == 'i' or tag == 'em':
            self.markdown.append('*')
        elif tag == 'a' and self.current_tag == 'a':
            self.current_tag = None
            
    def handle_data(self, data):
        self.markdown.append(data)
        
    def get_markdown(self):
        return ''.join(self.markdown).strip()

class KeepImporter:
    @staticmethod
    def parse_timestamp(usec_timestamp: int) -> datetime:
        """Convert Google Keep microsecond timestamp to datetime."""
        try:
            return datetime.fromtimestamp(usec_timestamp / 1_000_000)
        except (ValueError, TypeError):
            return datetime.now()
    
    @staticmethod
    def html_to_markdown(html_content: str) -> str:
        """Convert HTML content to Markdown."""
        converter = HTMLToMarkdownConverter()
        converter.feed(html_content)
        return converter.get_markdown()
    
    @staticmethod
    async def import_html_file(html_file: UploadFile, db: Session) -> Dict[str, Any]:
        """
        Import a single Google Keep HTML file.
        """
        try:
            # Read HTML content
            content = await html_file.read()
            html_content = content.decode('utf-8')
            
            # Convert to Markdown
            markdown_content = KeepImporter.html_to_markdown(html_content)
            
            # Extract title from HTML (look for <title> tag or first heading)
            import re
            title_match = re.search(r'<title>(.*?)</title>', html_content, re.IGNORECASE)
            title = title_match.group(1) if title_match else "Imported Note"
            
            # Get plain text for AI processing
            plain_text = markdown_content
            
            # AI Processing
            from ..services.gemini import analyze_content
            from ..models import CollectionModel
            
            # Get available tags from collections
            available_tags = [c.title for c in db.query(CollectionModel).all()]
            
            # Process with AI
            logger.info(f"Processing HTML note with AI: {title[:50]}")
            processed_data = analyze_content(
                text_input=plain_text,
                file_data=None,
                mime_type=None,
                available_tags=available_tags
            )
            
            # Create memo
            new_memo = MemoModel(
                id=str(uuid.uuid4()),
                original_input=plain_text,
                summary=processed_data.summary,
                extracted_text=processed_data.extracted_text,
                memo_types=json.dumps([t.value if hasattr(t, 'value') else t for t in processed_data.memo_types]),
                action_items=json.dumps(processed_data.action_items),
                completed_action_items=json.dumps([]),
                tags=json.dumps(processed_data.tags),
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now(),
                emotional_tone=processed_data.emotional_tone,
                confidence_score=processed_data.confidence_score,
                media_uri=None,
                media_type=None,
                html_content=markdown_content  # Store Markdown-converted HTML
            )
            
            db.add(new_memo)
            db.commit()
            
            logger.info(f"Successfully imported HTML note: {title}")
            return {"imported": 1, "skipped": 0}
            
        except Exception as e:
            logger.error(f"Error importing HTML file: {e}")
            raise ValueError(f"Failed to import HTML file: {str(e)}")

    @staticmethod
    async def import_takeout_zip(zip_file: UploadFile, db: Session) -> Dict[str, Any]:
        """
        Parses a Google Takeout ZIP file and imports notes.
        """
        imported_count = 0
        skipped_count = 0
        errors = []

        try:
            with zipfile.ZipFile(zip_file.file) as z:
                # Filter for JSON files
                json_files = [f for f in z.namelist() if f.endswith('.json')]
                
                for filename in json_files:
                    try:
                        with z.open(filename) as f:
                            data = json.loads(f.read().decode('utf-8'))
                            
                            # Extract base content
                            title = data.get('title', '')
                            text_content = data.get('textContent', '')
                            
                            # Handle List Content (Checkboxes)
                            list_content = data.get('listContent', [])
                            action_items = []
                            completed_items = []
                            
                            if list_content:
                                for idx, item in enumerate(list_content):
                                    text = item.get('text', '')
                                    if text:
                                        action_items.append(text)
                                        if item.get('isChecked'):
                                            completed_items.append(idx)

                            # Attachments (Images)
                            media_uri = None
                            media_type = None
                            attachments = data.get('attachments', [])
                            if attachments:
                                for att in attachments:
                                    # Focus on images for now
                                    if 'image' in att.get('mimetype', ''):
                                        rel_path = att.get('filePath')
                                        if rel_path:
                                            # Construct full path relative to JSON file
                                            parent_dir = os.path.dirname(filename)
                                            full_zip_path = os.path.join(parent_dir, rel_path)
                                            
                                            # Check if file exists in zip
                                            if full_zip_path in z.namelist():
                                                # Define target path
                                                ext = os.path.splitext(rel_path)[1]
                                                new_filename = f"{uuid.uuid4()}{ext}"
                                                target_path = os.path.join(ensure_upload_dir(), new_filename)
                                                
                                                # Extract and save
                                                try:
                                                    with z.open(full_zip_path) as source, open(target_path, "wb") as target:
                                                        shutil.copyfileobj(source, target)

                                                    # Set URI (relative path for static serving)
                                                    media_uri = f"/uploads/{new_filename}"
                                                    media_type = att.get('mimetype')
                                                    break # Only take the first image for now
                                                except OSError as e:
                                                    logger.warning(f"Could not persist attachment {full_zip_path}: {e}")

                            # Combine title and text for query
                            full_text = f"{title}\n{text_content}".strip()
                            if not full_text and not action_items and not media_uri:
                                # Mark as empty but import
                                full_text = "[Empty Note]"
                                
                            # Map Labels -> Tags
                            labels = [l.get('name') for l in data.get('labels', [])]
                            
                            # Parse dates
                            created_at = KeepImporter.parse_timestamp(data.get('createdTimestampUsec', 0))
                            updated_at = KeepImporter.parse_timestamp(data.get('userEditedTimestampUsec', 0))

                            # AI Processing
                            from ..services.gemini import analyze_content
                            from ..models import CollectionModel
                            
                            # Get available tags from collections
                            available_tags = [c.title for c in db.query(CollectionModel).all()]
                            
                            # Process with AI
                            logger.info(f"Processing note with AI: {title[:50] if title else 'Untitled'}")
                            processed_data = analyze_content(
                                text_input=full_text,
                                file_data=None,
                                mime_type=None,
                                available_tags=available_tags
                            )
                            
                            new_memo = MemoModel(
                                id=str(uuid.uuid4()),
                                original_input=processed_data.original_input,
                                summary=processed_data.summary,
                                extracted_text=processed_data.extracted_text,
                                memo_types=json.dumps([t.value if hasattr(t, 'value') else t for t in processed_data.memo_types]),
                                action_items=json.dumps(processed_data.action_items + action_items),  # Merge AI + Keep action items
                                completed_action_items=json.dumps(completed_items),
                                tags=json.dumps(processed_data.tags),  # Use only AI-generated tags
                                created_at=created_at.isoformat(),
                                updated_at=updated_at,
                                emotional_tone=processed_data.emotional_tone,
                                confidence_score=processed_data.confidence_score,
                                media_uri=media_uri,
                                media_type=media_type
                            )
                            
                            db.add(new_memo)
                            imported_count += 1
                            
                    except Exception as e:
                        logger.error(f"Error processing file {filename}: {e}")
                        errors.append(f"{filename}: {str(e)}")
                        
                db.commit()
                
        except zipfile.BadZipFile:
            raise ValueError("Invalid ZIP file")
            
        return {
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": errors
        }
