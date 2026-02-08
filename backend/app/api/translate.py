from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.utils import _get_client, _safe_json_parse


router = APIRouter(prefix="/translate", tags=["Translate"])


class TranslateRequest(BaseModel):
	text: str = Field(..., min_length=1)
	target_language: str = Field(..., min_length=1)


class TranslateResponse(BaseModel):
	translated_text: str


@router.post("", response_model=TranslateResponse)
def translate_text_endpoint(payload: TranslateRequest) -> TranslateResponse:
	prompt = (
		"You are a professional translator. Translate the input text from English to "
		f"{payload.target_language}.\n\n"
		"Return the response in JSON with this exact schema:\n"
		"{\n  \"translatedText\": string\n}"
	)

	client = _get_client()
	selected_model = "gemini-2.5-flash-lite"

	try:
		response = client.models.generate_content(
			model=selected_model,
			contents=f"{prompt}\n\nINPUT TEXT:\n{payload.text}",
			config={"response_mime_type": "application/json"},
		)
		if not getattr(response, "text", None):
			raise ValueError("Empty response from Gemini")
		parsed = _safe_json_parse(response.text)
		translated = str(parsed.get("translatedText", "")).strip()
		if not translated:
			raise ValueError("Translation not returned")
		return TranslateResponse(translated_text=translated)
	except Exception as exc:
		raise HTTPException(status_code=500, detail=str(exc)) from exc
