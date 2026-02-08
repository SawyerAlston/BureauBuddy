from fastapi import UploadFile, File
from fastapi import APIRouter, HTTPException
import tempfile
import os

router = APIRouter(prefix="/ingestpdf", tags=["PDF Ingestion"])

@router.post("/ingestpdf")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDFs allowed")

    # Save uploaded PDF to a temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        pdf_path = tmp.name

    try:
        # 🔥 Treat this exactly like a normal Python file now
        print("PDF saved at:", pdf_path)

        # process_pdf(pdf_path)

        return {
            "filename": file.filename,
            "status": "received"
        }

    finally:
        os.remove(pdf_path)
