from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.utils import _get_client, _safe_json_parse


router = APIRouter(prefix="/next_steps", tags=["Next Steps"])


class NextStepsRequest(BaseModel):
	form_context: str = Field(..., min_length=1)


class NextStepsResponse(BaseModel):
	steps: List[str]


@router.post("", response_model=NextStepsResponse)
def next_steps_endpoint(payload: NextStepsRequest) -> NextStepsResponse:
	prompt = (
		"You help people after they fill out legal or government forms. "
		"Read the form context and write the next steps for the person now that they have completed the form. "
		"Use very simple, 5th-grade language. Keep each step short and clear. "
		"Return 3 to 7 steps as a JSON array.\n\n"
		"Return the response in JSON with this exact schema:\n"
		"{\n  \"steps\": string[]\n}"
	)

	client = _get_client()
	selected_model = "gemini-2.5-flash-lite"

	try:
		response = client.models.generate_content(
			model=selected_model,
			contents=f"{prompt}\n\nFORM CONTEXT:\n{payload.form_context}",
			config={"response_mime_type": "application/json"},
		)
		if not getattr(response, "text", None):
			raise ValueError("Empty response from Gemini")
		parsed = _safe_json_parse(response.text)
		steps = parsed.get("steps", [])
		if not isinstance(steps, list) or not steps:
			raise ValueError("Next steps not returned")
		return NextStepsResponse(steps=[str(step).strip() for step in steps if str(step).strip()])
	except Exception as exc:
		raise HTTPException(status_code=500, detail=str(exc)) from exc
