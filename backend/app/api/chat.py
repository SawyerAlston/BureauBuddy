from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.utils import _get_client, _safe_json_parse


router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    document_context: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    answer: str


@router.post("", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    prompt = (
        "You are an expert assistant for government/legal documents. "
        "Answer the user's question using ONLY the provided document context. "
        "If the answer is not present, say you don't have enough information. "
        "Keep the answer concise and in plain language.\n\n"
        "Return JSON with this exact schema:\n"
        "{\n  \"answer\": string\n}"
    )

    client = _get_client()
    selected_model = "gemini-2.5-flash-lite"

    try:
        response = client.models.generate_content(
            model=selected_model,
            contents=(
                f"{prompt}\n\nDOCUMENT CONTEXT:\n{payload.document_context}"
                f"\n\nUSER QUESTION:\n{payload.question}"
            ),
            config={"response_mime_type": "application/json"},
        )
        if not getattr(response, "text", None):
            raise ValueError("Empty response from Gemini")
        parsed = _safe_json_parse(response.text)
        answer = str(parsed.get("answer", "")).strip()
        if not answer:
            raise ValueError("Answer not returned")
        return ChatResponse(answer=answer)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
