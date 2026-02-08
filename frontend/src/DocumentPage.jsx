import React, { useState, useRef, useEffect } from "react";

export default function DocumentPage({ fileURL, summary, formFields = [], onBack }) {
  const [showAudioDropdown, setShowAudioDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState(null);
  const [translatedFields, setTranslatedFields] = useState(null);
  const [summaryLang, setSummaryLang] = useState("en");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [summaryDraftLoading, setSummaryDraftLoading] = useState(false);
  const [summaryDraftError, setSummaryDraftError] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureRect, setCaptureRect] = useState(null);
  const [captureStart, setCaptureStart] = useState(null);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [selectionExplanation, setSelectionExplanation] = useState("");
  const [selectionLang, setSelectionLang] = useState("en");
  const [selectionTranslated, setSelectionTranslated] = useState("");
  const [selectionTranslating, setSelectionTranslating] = useState(false);
  const [selectionActions, setSelectionActions] = useState([]);
  const [selectionActionsLoading, setSelectionActionsLoading] = useState(false);
  const [selectionActionsError, setSelectionActionsError] = useState("");
  const [selectionDraft, setSelectionDraft] = useState("");
  const [selectionDraftLoading, setSelectionDraftLoading] = useState(false);
  const [selectionDraftError, setSelectionDraftError] = useState("");
  const audioRef = useRef(null);
  const captureVideoRef = useRef(null);
  const captureStreamRef = useRef(null);

  const LANGUAGES = [
    { code: "es", label: "Spanish" },
    { code: "fr", label: "French" },
    { code: "de", label: "German" },
    { code: "zh", label: "Chinese" },
    { code: "hi", label: "Hindi" },
    { code: "ar", label: "Arabic" },
    { code: "ru", label: "Russian" },
    { code: "ja", label: "Japanese" },
    { code: "pt", label: "Portuguese" },
     { code: "en", label: "English" },
  ];

  const AUDIO_SPEEDS = [
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: '1x (Normal)', value: 1 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 },
  ];

  const playTTSForText = async (text, speed) => {
    if (!text) return;

    try {
      const response = await fetch("http://localhost:8000/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("TTS backend error:", errText);
        throw new Error(errText);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new window.Audio(audioUrl);
      audio.playbackRate = speed;
      audioRef.current = audio;
      setAudioPlaying(true);
      audio.play();
      audio.onended = () => {
        setAudioPlaying(false);
        audioRef.current = null;
      };
    } catch (err) {
      console.error(err);
      alert("Text-to-speech failed. Check backend logs.");
      setAudioPlaying(false);
      audioRef.current = null;
    }
  };

  const playTTS = async (speed) => {
    const text = translatedSummary ?? summary;
    if (!text) return;
    playTTSForText(text, speed);
  };



  const handleAudioSpeed = (speed) => {
    setShowAudioDropdown(false);
    // If audio is playing, stop it first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioPlaying(false);
      audioRef.current = null;
    }
    playTTS(speed);
  };

  // Play/Pause button handler
  const handleAudioButton = () => {
    if (audioPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioPlaying(false);
      audioRef.current = null;
    } else {
      setShowAudioDropdown((prev) => !prev);
    }
  };

  const handleTranslate = async (langCode) => {
    setShowLangDropdown(false);
    setSummaryLang(langCode);
    if (langCode === "en") {
      setTranslatedSummary(null);
      setTranslatedFields(null);
      setSummaryDraft("");
      setSummaryDraftError("");
      return;
    }
    setTranslating(true);
    try {
      // Translate summary
      const res1 = await fetch("http://localhost:8000/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary, target_language: langCode })
      });
      const data1 = await res1.json();
      // Translate requirements (join as one string, split after)
      const joined = formFields.map(f => f.label).join("\n");
      const res2 = await fetch("http://localhost:8000/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: joined, target_language: langCode })
      });
      const data2 = await res2.json();
      setTranslatedSummary(data1.translated_text || summary);
      setTranslatedFields(
        (data2.translated_text || joined).split("\n").map((label, i) => ({ id: i + 1, label }))
      );
      setSummaryDraft("");
      setSummaryDraftError("");
    } catch (err) {
      setTranslatedSummary("Translation failed.");
      setTranslatedFields(formFields);
    } finally {
      setTranslating(false);
    }
  };

  const handleSelectionTranslate = async (langCode) => {
    setSelectionLang(langCode);
    if (langCode === "en") {
      setSelectionTranslated("");
      setSelectionActions([]);
      setSelectionActionsError("");
      setSelectionDraft("");
      setSelectionDraftError("");
      return;
    }
    if (!selectionExplanation) return;
    setSelectionTranslating(true);
    try {
      const res = await fetch("http://localhost:8000/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectionExplanation, target_language: langCode }),
      });
      const data = await res.json();
      const translated = data.translated_text || selectionExplanation;
      setSelectionTranslated(translated);
      setSelectionActions([]);
      setSelectionActionsError("");
      setSelectionDraft("");
      setSelectionDraftError("");
    } catch (err) {
      console.error(err);
      setSelectionTranslated("Translation failed.");
    } finally {
      setSelectionTranslating(false);
    }
  };

  const stopScreenCapture = () => {
    const stream = captureStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    captureStreamRef.current = null;
    setIsCapturing(false);
    setCaptureStart(null);
    setCaptureRect(null);
  };

  const startScreenCapture = async () => {
    setSelectionError("");
    setSelectionExplanation("");
    setSelectionTranslated("");
    setSelectionActions([]);
    setSelectionActionsError("");
    setSelectionDraft("");
    setSelectionDraftError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = captureVideoRef.current;
      if (!video) {
        throw new Error("Capture video element not ready.");
      }
      captureStreamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setIsCapturing(true);
    } catch (err) {
      console.error(err);
      setSelectionError("Screen capture was blocked or cancelled.");
      stopScreenCapture();
    }
  };

  const captureImageFromVideo = async (rect) => {
    const video = captureVideoRef.current;
    if (!video) return "";
    if (video.readyState < 2) {
      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve();
      });
    }
    const scaleX = video.videoWidth / window.innerWidth;
    const scaleY = video.videoHeight / window.innerHeight;
    const sx = Math.max(0, rect.x * scaleX);
    const sy = Math.max(0, rect.y * scaleY);
    const sw = Math.max(1, rect.width * scaleX);
    const sh = Math.max(1, rect.height * scaleY);
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(sw);
    canvas.height = Math.floor(sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  };

  const explainSelection = async (imageDataUrl) => {
    setSelectionLoading(true);
    setSelectionError("");
    setSelectionExplanation("");
    setSelectionTranslated("");
    setSelectionActions([]);
    setSelectionActionsError("");
    try {
      const response = await fetch("http://localhost:8000/analyze_doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_content: imageDataUrl,
          is_image: true,
          mime_type: "image/png",
          is_base64: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }

      const data = await response.json();
      const selectedText = (data.transcribed_text || "").trim();
      const contextText = (data.summary || selectedText || "").trim();

      if (!selectedText) {
        throw new Error("No text detected in the selected area.");
      }

      const simplifyResponse = await fetch("http://localhost:8000/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_text: selectedText,
          document_context: contextText,
        }),
      });

      if (!simplifyResponse.ok) {
        const errText = await simplifyResponse.text();
        throw new Error(errText);
      }

      const simplified = await simplifyResponse.json();
      const explanation = simplified.explanation || "";
      setSelectionExplanation(explanation || "No explanation returned.");
    } catch (err) {
      console.error(err);
      setSelectionError("Failed to explain the selected area.");
    } finally {
      setSelectionLoading(false);
    }
  };

  const getLanguageLabel = (code) => {
    const match = LANGUAGES.find((lang) => lang.code === code);
    return match ? match.label : code;
  };

  const getDraftConfig = (text) => {
    const haystack = (text || "").toLowerCase();
    if (haystack.includes("notice to vacate")) {
      return { label: "Draft Response", docType: "Notice to Vacate" };
    }
    if (haystack.includes("denial of benefits") || haystack.includes("benefits denial")) {
      return { label: "Draft Appeal Letter", docType: "Denial of Benefits" };
    }
    return { label: "Draft Response", docType: "General Document" };
  };

  const generateSummaryDraft = async () => {
    const baseText = (translatedSummary || summary || "").trim();
    const draftConfig = getDraftConfig(baseText);
    if (!draftConfig) {
      setSummaryDraftError("No draft template available for this document.");
      return;
    }
    if (!baseText) {
      setSummaryDraftError("No simplified text available yet.");
      return;
    }
    setSummaryDraftLoading(true);
    setSummaryDraftError("");
    setSummaryDraft("");
    try {
      const response = await fetch("http://localhost:8000/draft_response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: draftConfig.docType,
          document_context: baseText,
          language: getLanguageLabel(summaryLang),
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }
      const data = await response.json();
      setSummaryDraft(data.draft || "No draft returned.");
    } catch (err) {
      console.error(err);
      setSummaryDraftError("Failed to draft a response.");
    } finally {
      setSummaryDraftLoading(false);
    }
  };

  const generateSelectionActions = async () => {
    const baseExplanation = (selectionTranslated || selectionExplanation || "").trim();
    if (!baseExplanation) {
      setSelectionActionsError("No simplified text available yet.");
      return;
    }
    setSelectionActionsLoading(true);
    setSelectionActionsError("");
    setSelectionActions([]);
    try {
      const response = await fetch("http://localhost:8000/next_steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_context: baseExplanation }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }
      const data = await response.json();
      let steps = Array.isArray(data.steps) ? data.steps : [];
      if (selectionLang !== "en" && steps.length) {
        const joined = steps.join("\n");
        const translateRes = await fetch("http://localhost:8000/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: joined, target_language: selectionLang }),
        });
        if (translateRes.ok) {
          const translated = await translateRes.json();
          steps = String(translated.translated_text || joined)
            .split("\n")
            .map((step) => step.trim())
            .filter(Boolean);
        }
      }
      setSelectionActions(steps);
    } catch (err) {
      console.error(err);
      setSelectionActionsError("Failed to generate actions.");
    } finally {
      setSelectionActionsLoading(false);
    }
  };

  const handleCaptureMouseDown = (event) => {
    if (!isCapturing) return;
    setCaptureStart({ x: event.clientX, y: event.clientY });
    setCaptureRect({ x: event.clientX, y: event.clientY, width: 0, height: 0 });
  };

  const handleCaptureMouseMove = (event) => {
    if (!isCapturing || !captureStart) return;
    const x = Math.min(captureStart.x, event.clientX);
    const y = Math.min(captureStart.y, event.clientY);
    const width = Math.abs(event.clientX - captureStart.x);
    const height = Math.abs(event.clientY - captureStart.y);
    setCaptureRect({ x, y, width, height });
  };

  const handleCaptureMouseUp = async () => {
    if (!isCapturing || !captureRect) return;
    const minSize = 12;
    if (captureRect.width < minSize || captureRect.height < minSize) {
      setSelectionError("Selection too small. Try again.");
      setCaptureStart(null);
      setCaptureRect(null);
      return;
    }
    const imageDataUrl = await captureImageFromVideo(captureRect);
    stopScreenCapture();
    if (!imageDataUrl) {
      setSelectionError("Unable to capture the selected area.");
      return;
    }
    explainSelection(imageDataUrl);
  };

  useEffect(() => {
    if (!isCapturing) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        stopScreenCapture();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCapturing]);

  const summaryDraftConfig = getDraftConfig(translatedSummary || summary);

  return (
    <div className="h-screen bg-white grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
      {isCapturing ? (
        <div
          className="fixed inset-0 z-50 cursor-crosshair"
          onMouseDown={handleCaptureMouseDown}
          onMouseMove={handleCaptureMouseMove}
          onMouseUp={handleCaptureMouseUp}
        >
          <div className="absolute inset-0 bg-black/20" />
          {captureRect ? (
            <div
              className="absolute border-2 border-blue-400 bg-blue-200/20"
              style={{
                left: captureRect.x,
                top: captureRect.y,
                width: captureRect.width,
                height: captureRect.height,
              }}
            />
          ) : null}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 shadow">
            Drag to select an area. Press Esc to cancel.
          </div>
        </div>
      ) : null}
      <video ref={captureVideoRef} className="hidden" />
      {/* Left: viewer */}
      <section className="lg:col-span-2 bg-black">
        <div className="h-full bg-white overflow-auto">
          {fileURL ? (
            <iframe src={fileURL} className="w-full h-full" title="Uploaded Document" />
          ) : (
            <div className="p-10">
              <h2 className="text-2xl font-semibold mb-6">This would be the pdf</h2>
              <p className="text-slate-500">No document uploaded.</p>
            </div>
          )}
        </div>
      </section>

      {/* Right: explanation */}
      <aside className="h-full bg-white p-8 shadow-md flex flex-col overflow-hidden">
        {/* Scrollable content */}
        <div className="flex-1 overflow-auto">
          <div className="flex items-start justify-between">
            <h3 className="text-xl font-bold">Simplified Explanation</h3>
            <button onClick={onBack} className="text-sm text-slate-500 hover:underline">
              Back
            </button>
          </div>

          <div className="mt-4 text-slate-700 text-base">
            <blockquote className="border-l-4 border-slate-200 pl-4 italic">
              {translating ? "Translating..." : (translatedSummary || summary)}
            </blockquote>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={generateSummaryDraft}
              disabled={summaryDraftLoading}
              className="px-3 py-1.5 text-sm rounded-md bg-white border border-slate-200 text-slate-700 disabled:opacity-50"
            >
              {summaryDraftLoading ? "Drafting..." : summaryDraftConfig.label}
            </button>
          </div>
          {summaryDraftError ? (
            <div className="mt-2 text-sm text-red-600">{summaryDraftError}</div>
          ) : null}
          {summaryDraft ? (
            <div className="mt-3 text-slate-700 text-base">
              <div className="text-sm font-semibold text-slate-700 mb-1">Draft</div>
              <blockquote className="border-l-4 border-slate-200 pl-4 italic whitespace-pre-wrap">
                {summaryDraft}
              </blockquote>
            </div>
          ) : null}

          <div className="mt-8">
            <h4 className="text-lg font-semibold mb-3">Steps to Take</h4>
            <ul className="list-disc list-inside space-y-2 text-slate-800">
              {(translatedFields || formFields).map((field) => (
                <li key={field.id}>{field.label}</li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <h4 className="text-lg font-semibold mb-2">Explain a Selection</h4>
            <p className="text-sm text-slate-500 mb-3">
              Click Select Area, then drag a rectangle over the PDF.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={startScreenCapture}
                disabled={!fileURL || isCapturing || selectionLoading}
                className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white disabled:opacity-50"
              >
                {isCapturing ? "Selecting..." : "Select Area"}
              </button>
              <button
                onClick={stopScreenCapture}
                disabled={!isCapturing}
                className="px-3 py-1.5 text-sm rounded-md bg-white border border-slate-200 text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={selectionLang}
                onChange={(e) => handleSelectionTranslate(e.target.value)}
                className="border border-slate-200 rounded-md px-2 py-1 text-sm bg-white"
                aria-label="Selection language"
                disabled={!selectionExplanation}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  playTTSForText(
                    selectionTranslated || selectionExplanation,
                    1,
                  )
                }
                disabled={!selectionExplanation}
                className="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 disabled:opacity-50"
              >
                Speak
              </button>
              <button
                onClick={generateSelectionActions}
                disabled={!selectionExplanation || selectionActionsLoading}
                className="px-3 py-1.5 text-sm rounded-md bg-white border border-slate-200 text-slate-700 disabled:opacity-50"
              >
                {selectionActionsLoading ? "Loading..." : "Action"}
              </button>
            </div>

            {selectionLoading ? (
              <div className="mt-2 text-sm text-slate-500">Explaining...</div>
            ) : null}
            {selectionTranslating ? (
              <div className="mt-2 text-sm text-slate-500">Translating...</div>
            ) : null}
            {selectionError ? (
              <div className="mt-2 text-sm text-red-600">{selectionError}</div>
            ) : null}
            {selectionExplanation ? (
              <div className="mt-3 text-slate-700 text-base">
                <blockquote className="border-l-4 border-slate-200 pl-4 italic">
                  {selectionTranslated || selectionExplanation}
                </blockquote>
              </div>
            ) : null}
            {selectionActionsError ? (
              <div className="mt-2 text-sm text-red-600">{selectionActionsError}</div>
            ) : null}
            {selectionActions.length ? (
              <div className="mt-3">
                <div className="text-sm font-semibold text-slate-700 mb-1">Actions</div>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                  {selectionActions.map((step, idx) => (
                    <li key={`${step}-${idx}`}>{step}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

        </div>

        {/* Bottom buttons */}
        <div className="mt-6 flex gap-3 relative">
          <button
            className="w-16 h-16 text-3xl bg-slate-100 rounded-md grid place-items-center"
            onClick={handleAudioButton}
            id="audio-btn"
            aria-label={audioPlaying ? "Pause audio" : "Play audio"}
          >
            {audioPlaying ? "⏹" : "🔊"}
          </button>
          <button className="w-16 h-16 text-xl bg-slate-100 rounded-md grid place-items-center" onClick={() => setShowLangDropdown((prev) => !prev)}>
            🌐
          </button>
          {showAudioDropdown && (
            <div className="absolute bottom-20 left-0 bg-white border border-slate-200 rounded-md shadow-lg p-3 w-40 z-10">
              <div className="font-semibold mb-2 text-sm text-slate-700">Audio Speed</div>
              <ul className="space-y-1">
                {AUDIO_SPEEDS.map((opt) => (
                  <li key={opt.value}>
                    <button className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded" onClick={() => handleAudioSpeed(opt.value)}>
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showLangDropdown && (
            <div className="absolute bottom-20 bg-white border border-slate-200 rounded-md shadow-lg p-3 w-40 z-10">
              <div className="font-semibold mb-2 text-sm text-slate-700">Language</div>
              <ul className="space-y-1">
                {LANGUAGES.map((lang) => (
                  <li key={lang.code}>
                    <button className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded" onClick={() => handleTranslate(lang.code)}>
                      {lang.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}