from fastapi import FastAPI
from app.api import simplify_text, analyze_doc, pdf_ingest, tts, translate, next_steps, draft_response, important_info, chat
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TidalHACK Backend API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(simplify_text.router)
app.include_router(analyze_doc.router)
app.include_router(tts.router)
app.include_router(translate.router)
app.include_router(next_steps.router)
app.include_router(draft_response.router)
app.include_router(important_info.router)
app.include_router(chat.router)
#app.include_router(pdf_ingest.router)

