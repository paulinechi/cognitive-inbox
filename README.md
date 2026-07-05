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

This application leverages Google Gemini (via the `google-genai` SDK, default model `gemini-flash-lite-latest`, configurable in `backend/application.yaml`):

- Analyzes text and images, and transcribes + analyzes audio notes directly (no separate speech-to-text service).
- Performs categorization (Idea, Task, Wishlist, etc.), summarization, tagging, action-item extraction, and sentiment analysis.

## Authentication

The API requires an account. Register or sign in from the app's auth screen; the backend issues a JWT (30-day expiry by default) and all memos/collections are scoped per user.

- `POST /auth/register` / `POST /auth/login` with `{"email", "password"}` return `{"access_token", "user"}`.
- All other endpoints require an `Authorization: Bearer <token>` header.
- Set `SECRET_KEY` in `backend/.env` (see `.env.example`) — without it tokens are signed with an ephemeral key and become invalid on every restart.

## How to Run

The project includes convenience scripts to launch both the backend and frontend services:
- **Unix/macOS/Linux**: `start.sh`
- **Windows**: `start.ps1` (PowerShell)

### Prerequisites
- Node.js & npm
- Python 3.8+
- Expo Go app on your iOS/Android device (for physical device testing) or an Emulator/Simulator.
- **Windows users**: PowerShell with script execution enabled (see setup below)

### Quick Start

#### 1. Setup Backend

**Unix/macOS/Linux:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Ensure you have a .env file with GOOGLE_API_KEY and SECRET_KEY (see .env.example)
cd ..
```

**Windows (PowerShell):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Ensure you have a .env file with GOOGLE_API_KEY
cd ..
```

> **Note for Windows users**: If you get an execution policy error, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

#### 2. Setup Frontend
```bash
cd mobile-app
npm install
cd ..
```


#### 3. Run the App

**Unix/macOS/Linux** (using `start.sh`):

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

**Windows** (using `start.ps1`):

- **For iOS (Simulator):**
  ```powershell
  .\start.ps1 i
  ```

- **For Android (Emulator):**
  ```powershell
  .\start.ps1 a
  ```

- **Clear Cache:**
  If you encounter styling issues, use the `-Clear` flag:
  ```powershell
  .\start.ps1 i -Clear
  ```

## Database Inspection

The application uses SQLite, with the database file located at `backend/cognitive_inbox.db`.

### How to View the Data

- **VS Code Extension**: Install **"SQLite Viewer"** and click on `backend/cognitive_inbox.db`.
- **CLI**: Use `sqlite3 backend/cognitive_inbox.db` from your terminal.

### Commonly Used Queries

Here are some helpful SQL queries for the `memos` table:

- **View all memos (newest first):**
  ```sql
  SELECT id, memo_type, summary, created_at FROM memos ORDER BY created_at DESC;
  ```

- **Filter by memo type:**
  ```sql
  SELECT id, summary FROM memos WHERE memo_type = 'Task';
  ```

- **Search for keywords in original input:**
  ```sql
  SELECT * FROM memos WHERE original_input LIKE '%shopping%';
  ```

- **Count memos by type:**
  ```sql
  SELECT memo_type, COUNT(*) as count FROM memos GROUP BY memo_type;
  ```

- **View high-confidence memos (>0.8):**
  ```sql
  SELECT summary, confidence_score FROM memos WHERE confidence_score > 0.8;
  ```

### Manual Start

If you prefer to run services individually:

**Backend (Unix/macOS/Linux):**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Backend (Windows PowerShell):**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend (All platforms):**
```bash
cd mobile-app
npx expo start
```

## Vercel API Proxy Routing (No CORS)

For web builds, the frontend now calls same-origin `/api` (`mobile-app/src/config/api.js`) and Vercel rewrites that path to the backend preview deployment (`mobile-app/vercel.json`).

This keeps backend logic unchanged and avoids browser CORS issues:
- Frontend calls same origin (`/api/...`)
- Vercel proxies to backend (`https://cognitive-inbox-kz8e.vercel.app/...`)
- No direct browser call to cross-origin backend URL

### Deploy the routing change

Redeploy the frontend project on Vercel so rewrites are applied:

```bash
cd mobile-app
vercel --prod
```

### Notes

- Native app behavior is unchanged: it still uses `EXPO_PUBLIC_API_URL` when set, then local-host fallbacks for development.
- If backend preview URL changes, update the `/api/:path*` rewrite destination in `mobile-app/vercel.json`.

## Running Tests

Backend smoke tests (auth, capture with mocked Gemini, per-user isolation, upload validation):

```bash
cd backend
./venv/bin/python -m pytest tests/ -q
```

## Building for the App Store (iOS)

The app is configured with bundle ID `com.paulinechi.cognitiveinbox` and EAS build profiles in `mobile-app/eas.json`.

1. One-time setup: an [Apple Developer account](https://developer.apple.com) ($99/yr) and `npm install -g eas-cli && eas login`.
2. Point production builds at your backend: the `EXPO_PUBLIC_API_URL` env in `eas.json` (currently the Vercel backend).
3. Build and submit:
   ```bash
   cd mobile-app
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

Before a public release you still need: a persistent production database (SQLite on Vercel lives in `/tmp` and is wiped on cold starts — use hosted Postgres via `DATABASE_URL`), durable media storage for uploads, a `SECRET_KEY` env var on the backend, a privacy policy URL, and App Store privacy labels (mic/camera/photos; content is processed by Google Gemini).
