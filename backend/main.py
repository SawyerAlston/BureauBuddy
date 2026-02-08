from fastapi import FastAPI
from app.api import simplify_text, analyze_doc, pdf_ingest


app = FastAPI(title="TidalHACK Backend API", version="1.0")

app.include_router(simplify_text.router)
app.include_router(analyze_doc.router)
#app.include_router(pdf_ingest.router)
