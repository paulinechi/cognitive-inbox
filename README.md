# cognitive-inbox

Cognitive Inbox is an intelligent application designed to capture, analyze, and organize your thoughts, ideas, and tasks using advanced AI models.

## Tech Stack

### Backend
- **Language**: Python
- **Framework**: FastAPI
- **Database**: SQLite
- **Server**: Uvicorn

### Frontend (Mobile App)
- **Framework**: React Native
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Language**: JavaScript/React

## AI Models Used

This application leverages powerful AI models to process and understand your inputs:

- **Google Gemini 2.0 Flash**: 
  - Used for analyzing text, images, and transcribed audio.
  - Performs categorization (Idea, Task, Wishlist, etc.), summarization, tagging, and sentiment analysis.
  
- **OpenAI Whisper**: 
  - Used for accurate speech-to-text transcription of audio notes.

## How to Run

The project includes a convenience script `start.sh` to launch both the backend and frontend services.

### Prerequisites
- Node.js & npm
- Python 3.8+
- Expo Go app on your iOS/Android device (for physical device testing) or an Emulator/Simulator.

### Quick Start

1. **Setup Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   # Ensure you have a .env file with GOOGLE_API_KEY
   cd ..
   ```

2. **Setup Frontend**:
   ```bash
   cd mobile-app
   npm install
   cd ..
   ```

3. **Run the App**:
   You can use the provided `start.sh` script to run both services simultaneously.

   - **For iOS (Simulator):**
     ```bash
     ./start.sh i
     ```
   
   - **For Android (Emulator):**
     ```bash
     ./start.sh a
     ```

   - **Clear Cache:**
     If you encounter styling issues, run with the clear flag:
     ```bash
     ./start.sh i --clear
     ```

### Manual Start

If you prefer to run services individually:

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd mobile-app
npx expo start
```
