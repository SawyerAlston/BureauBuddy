from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from utils import _get_client, _safe_json_parse, SimplifyResult


router = APIRouter(prefix="/simplify", tags=["Simplify"])


class SimplifyRequest(BaseModel):
    selected_text: str = Field(..., min_length=1)
    document_context: str = Field(..., min_length=1)
    model: Optional[str] = None


class SimplifyResponse(BaseModel):
    explanation: str
    key_terms: List[str]

def simplify_text(
    selected_text: str,
    document_context: str,
    model: Optional[str] = "gemini-1.5-flash",
) -> SimplifyResult:
    prompt = (
        "The user is reading a bureaucratic document and is confused by this specific text: "
        f"\"{selected_text}\".\n\n"
        "Context of the document:\n"
        f"{document_context[:1000]}... (truncated for brevity)\n\n"
        "Task:\n"
        "1. Explain the selected text in extremely simple, 'Plain English' terms "
        "(like you are explaining to a 5-year-old or non-native speaker).\n"
        "2. Identify 1-3 specific legal/complex terms in the selection and define them simply.\n"
    )

    client = _get_client()
    selected_model = model or "gemini-1.5-flash"

    response = client.models.generate_content(
        model=selected_model,
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )

    if not getattr(response, "text", None):
        raise ValueError("Empty response from Gemini")

    parsed = _safe_json_parse(response.text)
    return SimplifyResult.from_dict(parsed)


@router.post("", response_model=SimplifyResponse)
def simplify_text_endpoint(payload: SimplifyRequest) -> SimplifyResponse:
    try:
        result = simplify_text(
            selected_text=payload.selected_text,
            document_context=payload.document_context,
            model=payload.model,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return SimplifyResponse(explanation=result.explanation, key_terms=result.key_terms)