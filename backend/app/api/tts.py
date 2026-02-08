import os

import anyio
from elevenlabs.client import ElevenLabs
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import Response
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/tts", tags=["TTS"])


class TTSRequest(BaseModel):
	text: str = Field(..., min_length=1)
	model_id: str = "eleven_multilingual_v2"
	output_format: str = "mp3_44100_128"


@router.post("", response_class=Response)
async def synthesize_tts(payload: TTSRequest) -> Response:
	api_key = os.getenv("ELEVENLABS_API_KEY")
	if not api_key:
		raise HTTPException(status_code=500, detail="Missing ELEVENLABS_API_KEY")

	voice_id = os.getenv("ELEVENLABS_VOICE_ID", "hpp4J3VqNfWAUOO0d1Us")

	client = ElevenLabs(api_key=api_key)

	try:
		audio = await anyio.to_thread.run_sync(
			lambda: client.text_to_speech.convert(
				text=payload.text,
				voice_id=voice_id,
				model_id=payload.model_id,
				output_format=payload.output_format,
			)
		)
	except Exception as exc:
		raise HTTPException(status_code=502, detail=f"TTS request failed: {exc}") from exc

	if hasattr(audio, "__iter__") and not isinstance(audio, (bytes, bytearray)):
		audio = b"".join(audio)

	return Response(content=audio, media_type="audio/mpeg")
