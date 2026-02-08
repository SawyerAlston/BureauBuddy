from typing import Optional, Union, List
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from utils import (_get_client, _safe_json_parse, _strip_data_url, DocumentAnalysis, extract_text_from_pdf_bytes)
import base64


router = APIRouter(prefix="/analyze_doc", tags=["Analyze"])


class AnalyzeRequest(BaseModel):
    file_content: str = Field(..., min_length=1)
    is_image: bool = False
    mime_type: str = "text/plain"
    model: Optional[str] = None
    is_base64: bool = False


class AnalyzeResponse(BaseModel):
    purpose: str
    summary: str
    transcribed_text: str
    requirements: List[str]

def analyze_document(
    file_content: Union[str, bytes],
    is_image: bool,
    mime_type: str = "text/plain",
    model: Optional[str] = "gemini-2.5-flash-lite",
) -> DocumentAnalysis:
    prompt = (
        "You are an expert in simplifying bureaucratic, legal, and government forms.\n"
        "Analyze the following document content.\n\n"
        "Tasks:\n"
        "1. Transcribe the full text content accurately if it's an image. If it's already text, just use it.\n"
        "2. Provide a clear, 'Plain English' summary of the document's main purpose.\n"
        "3. List the key requirements or action items for the user (e.g., 'Submit by date X', 'Attach ID').\n\n"
        "Return the response in JSON format with this exact schema:\n"
        "{\n"
        "  \"purpose\": string,\n"
        "  \"summary\": string,\n"
        "  \"transcribedText\": string,\n"
        "  \"requirements\": string[]\n"
        "}\n"
    )

    client = _get_client()
    selected_model = model or "gemini-2.5-flash-lite"

    content_text: Optional[str] = None

    if is_image:
        base64_data = _strip_data_url(file_content)
        # Validate base64 to fail fast on bad input
        base64.b64decode(base64_data, validate=True)
        contents = [
            {
                "parts": [
                    {"inline_data": {"mime_type": mime_type, "data": base64_data}},
                    {"text": prompt},
                ]
            }
        ]
    else:
        if isinstance(file_content, (bytes, bytearray)):
            if mime_type == "application/pdf" or file_content[:4] == b"%PDF":
                content_text = extract_text_from_pdf_bytes(bytes(file_content))
            else:
                content_text = bytes(file_content).decode("utf-8", errors="ignore")
        else:
            content_text = file_content

        contents = f"{prompt}\n\nDOCUMENT CONTENT:\n{content_text}"

    response = client.models.generate_content(
        model=selected_model,
        contents=contents,
        config={"response_mime_type": "application/json"},
    )

    if not getattr(response, "text", None):
        raise ValueError("Empty response from Gemini")

    parsed = _safe_json_parse(response.text)
    result = DocumentAnalysis.from_dict(parsed)

    if not result.transcribed_text and content_text is not None:
        result.transcribed_text = content_text
    if not result.summary and result.transcribed_text:
        result.summary = result.transcribed_text[:500].strip()
    if not result.purpose:
        result.purpose = result.summary or "Document purpose not provided."
    if not isinstance(result.requirements, list):
        result.requirements = []
    return result


@router.post("", response_model=AnalyzeResponse)
def analyze_document_endpoint(payload: AnalyzeRequest) -> AnalyzeResponse:
    try:
        content: Union[str, bytes] = payload.file_content
        if payload.is_base64 and not payload.is_image:
            content = base64.b64decode(payload.file_content)

        result = analyze_document(
            file_content=content,
            is_image=payload.is_image,
            mime_type=payload.mime_type,
            model=payload.model,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AnalyzeResponse(
        purpose=result.purpose,
        summary=result.summary,
        transcribed_text=result.transcribed_text,
        requirements=result.requirements,
    )


@router.post("/upload", response_model=AnalyzeResponse)
async def analyze_document_upload(
    file: UploadFile = File(...),
    model: Optional[str] = None,
) -> AnalyzeResponse:
    if not file.content_type:
        raise HTTPException(status_code=400, detail="Missing content type")

    pdf_bytes = await file.read()

    try:
        result = analyze_document(
            file_content=pdf_bytes,
            is_image=file.content_type.startswith("image/"),
            mime_type=file.content_type,
            model=model,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AnalyzeResponse(
        purpose=result.purpose,
        summary=result.summary,
        transcribed_text=result.transcribed_text,
        requirements=result.requirements,
    )