from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.utils import _get_client, _safe_json_parse


router = APIRouter(prefix="/draft_response", tags=["Draft Response"])


class DraftResponseRequest(BaseModel):
    document_type: str = Field(..., min_length=1)
    document_context: str = Field(..., min_length=1)
    language: str = Field(default="English", min_length=1)


class DraftResponsePayload(BaseModel):
    draft: str


@router.post("", response_model=DraftResponsePayload)
def draft_response_endpoint(payload: DraftResponseRequest) -> DraftResponsePayload:
    prompt = (
        "You are a helpful legal aid assistant. Draft a concise response letter based on the "
        "document type and the provided context. Use a polite, professional tone and plain language. "
        "If key details are missing (names, dates, addresses), insert short placeholders like "
        "[Your Name] or [Date]. Keep the response focused on next steps or an appeal.\n\n"
        f"Document type: {payload.document_type}\n"
        f"Language: {payload.language}\n\n"
        "Return the response in JSON with this exact schema:\n"
        "{\n  \"draft\": string\n}"
    )

    client = _get_client()
    selected_model = "gemini-2.5-flash-lite"

    try:
        response = client.models.generate_content(
            model=selected_model,
            contents=f"{prompt}\n\nDOCUMENT CONTEXT:\n{payload.document_context}",
            config={"response_mime_type": "application/json"},
        )
        if not getattr(response, "text", None):
            raise ValueError("Empty response from Gemini")
        parsed = _safe_json_parse(response.text)
        draft = str(parsed.get("draft", "")).strip()
        if not draft:
            raise ValueError("Draft response not returned")
        return DraftResponsePayload(draft=draft)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
