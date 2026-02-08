from __future__ import annotations
from dotenv import load_dotenv
import json
import os
import re
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from dataclasses import dataclass
from io import BytesIO
from typing import Iterable
try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - runtime guard
    PdfReader = None

if TYPE_CHECKING:
    from google import genai



load_dotenv()

def _get_client() -> "genai.Client":
    try:
        from google import genai as genai_module
    except Exception:
        try:
            import google.genai as genai_module
        except Exception as exc:  # pragma: no cover - runtime guard
            raise ImportError(
                "google-genai is not available in the active interpreter. "
                "Install it in the same environment running the app."
            ) from exc

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Missing GEMINI_API_KEY environment variable.")
    return genai_module.Client(api_key=api_key)

def _safe_json_parse(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))

def _strip_data_url(data: str) -> str:
    if "," in data:
        return data.split(",", 1)[1]
    return data

@dataclass
class DocumentAnalysis:
    purpose: str
    summary: str
    transcribed_text: str
    requirements: List[str]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DocumentAnalysis":
        return cls(
            purpose=str(data.get("purpose", "")),
            summary=str(data.get("summary", "")),
            transcribed_text=str(data.get("transcribedText", data.get("transcribed_text", ""))),
            requirements=list(data.get("requirements", [])),
        )


@dataclass
class SimplifyResult:
    explanation: str
    key_terms: List[str]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SimplifyResult":
        return cls(
            explanation=str(data.get("explanation", "")),
            key_terms=list(data.get("keyTerms", data.get("key_terms", []))),
        )

def extract_text_from_pdf_bytes(data: bytes) -> str:
    if PdfReader is None:
        raise ImportError(
            "pypdf is not available in the active interpreter. "
            "Install it in the same environment running the app."
        )
    reader = PdfReader(BytesIO(data))
    full_text_parts: list[str] = []

    for index, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        full_text_parts.append(f"--- Page {index} ---\n{page_text}\n")

    return "\n".join(full_text_parts).strip()


def extract_text_from_pdf_stream(stream: BytesIO) -> str:
    return extract_text_from_pdf_bytes(stream.getvalue())


def extract_text_from_pdf_file(path: str) -> str:
    with open(path, "rb") as handle:
        return extract_text_from_pdf_bytes(handle.read())