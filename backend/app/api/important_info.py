from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.utils import _get_client, _safe_json_parse


router = APIRouter(prefix="/important_info", tags=["Important Info"])


class ImportantInfoRequest(BaseModel):
    document_context: str = Field(..., min_length=1)


class ImportantInfoResponse(BaseModel):
    deadlines: List[str]
    notices: List[str]
    rules: List[str]
    other: List[str]


@router.post("", response_model=ImportantInfoResponse)
def important_info_endpoint(payload: ImportantInfoRequest) -> ImportantInfoResponse:
    prompt = (
        "You extract critical information from government or legal documents. "
        "Read the document and return only the most important details.\n\n"
        "Return JSON with these lists:\n"
        "- deadlines: date/time limits or due dates\n"
        "- notices: warnings, penalties, consequences, or required notices\n"
        "- rules: eligibility rules, conditions, or requirements\n"
        "- other: other critical facts (contact info, locations, fees)\n\n"
        "Return the response in JSON with this exact schema:\n"
        "{\n"
        "  \"deadlines\": string[],\n"
        "  \"notices\": string[],\n"
        "  \"rules\": string[],\n"
        "  \"other\": string[]\n"
        "}"
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
        deadlines = parsed.get("deadlines", [])
        notices = parsed.get("notices", [])
        rules = parsed.get("rules", [])
        other = parsed.get("other", [])
        return ImportantInfoResponse(
            deadlines=[str(item).strip() for item in deadlines if str(item).strip()],
            notices=[str(item).strip() for item in notices if str(item).strip()],
            rules=[str(item).strip() for item in rules if str(item).strip()],
            other=[str(item).strip() for item in other if str(item).strip()],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
