# BureauBuddy

*A TidalHACK '26 Creation*

**BureauBuddy** is a document‑processing application for government and legal forms. It provides PDF ingestion, structured analysis, translation, text‑to‑speech synthesis, and actionable next‑step guidance through a FastAPI backend and React frontend.

## Features

- PDF upload with server‑side extraction and analysis.
- Plain‑language summaries and selection‑based simplification.
- Deterministic “next steps” guidance for completed forms.
- Translation of selected content to a target language.
- Text‑to‑speech synthesis via ElevenLabs.
- Minimal UI focused on reading, selection, and playback.

## Tech Stack

- Backend: FastAPI, google‑genai (Gemini), ElevenLabs SDK, httpx, pypdf, python‑multipart
- Frontend: React 18, Vite, TailwindCSS

## Project Structure

- backend: FastAPI app and API routes
- frontend: React UI

## Setup

### 1) Backend

Create and activate a virtual environment, then install backend dependencies:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a .env file in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=optional_voice_id
```

Start the API:

```bash
uvicorn backend.main:app --reload --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the API at http://localhost:8000.

## API Endpoints

- POST /analyze_doc/upload: Upload a PDF and extract summary + key information
- POST /simplify: Simplify selected text
- POST /translate: Translate text to a target language
- POST /tts: Generate audio from text (ElevenLabs)
- POST /next_steps: Generate next‑step guidance
- POST /important_info: Extract important details

## Python Dependencies

Declared in requirements.txt:

- google‑genai
- elevenlabs
- httpx
- pypdf
- python‑multipart

## Notes

- GEMINI_API_KEY is required for all Gemini‑backed endpoints.
- ELEVENLABS_VOICE_ID is optional; a default voice is used if not provided.

## License

MIT
