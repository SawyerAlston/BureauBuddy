from fastapi import FastAPI
from app.api import simplify_text, analyze_doc, pdf_ingest, tts, translate, next_steps


app = FastAPI(title="TidalHACK Backend API", version="1.0")

app.include_router(simplify_text.router)
app.include_router(analyze_doc.router)
app.include_router(tts.router)
app.include_router(translate.router)
app.include_router(next_steps.router)
#app.include_router(pdf_ingest.router)
