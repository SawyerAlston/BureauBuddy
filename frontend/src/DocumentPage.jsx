import React, { useState, useRef, useEffect } from "react";

export default function DocumentPage({
  fileURL,
  summary,
  importantInfo,
  formFields = [],
  onBack,
  isProcessing,
}) {
  const [translating, setTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState(null);
  const [translatedFields, setTranslatedFields] = useState(null);
  const [translatedImportantInfo, setTranslatedImportantInfo] = useState(null);
  const [summaryLang, setSummaryLang] = useState("en");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureRect, setCaptureRect] = useState(null);
  const [captureStart, setCaptureStart] = useState(null);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [selectionExplanation, setSelectionExplanation] = useState("");
  const [selectionTranslated, setSelectionTranslated] = useState("");
  const [selectionTranslating, setSelectionTranslating] = useState(false);
  const [showImportantInfo, setShowImportantInfo] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
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



  // Play/Pause button handler
  const handleAudioButton = () => {
    if (audioPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioPlaying(false);
      audioRef.current = null;
    } else {
      playTTS(1);
    }
  };

  const handleTranslate = async (langCode) => {
    setSummaryLang(langCode);
    if (langCode === "en") {
      setTranslatedSummary(null);
      setTranslatedFields(null);
      setTranslatedImportantInfo(null);
      setSelectionTranslated("");
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

      // Translate importantInfo fields
      let translatedInfo = {};
      if (importantInfo) {
        const infoFields = [
          { key: "deadlines", value: importantInfo.deadlines },
          { key: "notices", value: importantInfo.notices },
          { key: "rules", value: importantInfo.rules },
          { key: "other", value: importantInfo.other }
        ];
        for (const field of infoFields) {
          if (field.value && field.value.length) {
            const joinedField = field.value.join("\n");
            const res = await fetch("http://localhost:8000/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: joinedField, target_language: langCode })
            });
            const data = await res.json();
            translatedInfo[field.key] = (data.translated_text || joinedField).split("\n");
          } else {
            translatedInfo[field.key] = [];
          }
        }
      }
      setTranslatedSummary(data1.translated_text || summary);
      setTranslatedFields(
        (data2.translated_text || joined).split("\n").map((label, i) => ({ id: i + 1, label }))
      );
      setTranslatedImportantInfo(translatedInfo);

      if (selectionExplanation) {
        setSelectionTranslating(true);
        const selectionRes = await fetch("http://localhost:8000/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: selectionExplanation, target_language: langCode })
        });
        const selectionData = await selectionRes.json();
        setSelectionTranslated(selectionData.translated_text || selectionExplanation);
      }
    } catch (err) {
      setTranslatedSummary("Translation failed.");
      setTranslatedFields(formFields);
      setTranslatedImportantInfo(null);
    } finally {
      setTranslating(false);
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
      // If explanation is a JSON array, parse it, otherwise use as is
      let parsedExplanation = explanation;
      try {
        if (typeof explanation === 'string' && explanation.trim().startsWith('[')) {
          parsedExplanation = JSON.parse(explanation);
        }
      } catch (e) {
        // fallback to string
        parsedExplanation = explanation;
      }
      setSelectionExplanation(parsedExplanation || "No explanation returned.");
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

  const hasSelectionSummary = Boolean(selectionTranslated || selectionExplanation);
  const summaryDisplay = hasSelectionSummary
    ? (selectionTranslated || selectionExplanation)
    : (translating ? "Translating..." : translatedSummary || summary);


  return (
  <div className="h-screen bg-white grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
    {isCapturing && (
      <div
        className="fixed inset-0 z-50 cursor-crosshair"
        onMouseDown={handleCaptureMouseDown}
        onMouseMove={handleCaptureMouseMove}
        onMouseUp={handleCaptureMouseUp}
      >
        <div className="absolute inset-0 bg-black/20" />
        {captureRect && (
          <div
            className="absolute border-2 border-blue-400 bg-blue-200/20"
            style={{
              left: captureRect.x,
              top: captureRect.y,
              width: captureRect.width,
              height: captureRect.height,
            }}
          />
        )}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 shadow">
          Drag to select an area. Press Esc to cancel.
        </div>
      </div>
    )}

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
    <aside className="h-full bg-white pt-4 pb-6 px-8 shadow-md flex flex-col overflow-hidden">
      {isProcessing ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-500 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-700">
            Analyzing your document…
          </h3>
          <p className="text-sm text-slate-500 mt-1">This may take a few moments</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 gap-6">
          <div className="flex items-start justify-between">
            <button
              onClick={onBack}
              className="text-lg font-semibold leading-none text-left"
              aria-label="Go home"
              type="button"
            >
              <span className="text-blue-500">Bureau</span>
              <span className="text-slate-900">Buddy</span>
            </button>
            <button onClick={onBack} className="text-sm text-slate-500 hover:underline">
              Home →
            </button>
          </div>

          <div className="flex flex-col gap-5 min-h-0 -mt-2">
            {(translatedImportantInfo || importantInfo) && (
              <div>
                <button
                  onClick={() => setShowImportantInfo((prev) => !prev)}
                  className="w-full flex items-center justify-between text-left text-lg font-semibold text-slate-900"
                  aria-expanded={showImportantInfo}
                >
                  <span className="text-lg font-semibold text-slate-900">Expanded Info</span>
                  <span className="text-sm text-slate-500">
                    {showImportantInfo ? "Hide" : "Show"}
                  </span>
                </button>

                {showImportantInfo && (
                  <div className="mt-3 max-h-40 overflow-auto pr-2 soft-scroll">
                    {((translatedImportantInfo?.deadlines ?? importantInfo?.deadlines) || []).length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-slate-700 mb-1">
                          Deadlines
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-800">
                          {(translatedImportantInfo?.deadlines ?? importantInfo?.deadlines ?? []).map((item, idx) => (
                            <li key={`deadline-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {((translatedImportantInfo?.notices ?? importantInfo?.notices) || []).length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-slate-700 mb-1">
                          Notices
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-800">
                          {(translatedImportantInfo?.notices ?? importantInfo?.notices ?? []).map((item, idx) => (
                            <li key={`notice-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {((translatedImportantInfo?.rules ?? importantInfo?.rules) || []).length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-slate-700 mb-1">Rules</div>
                        <ul className="list-disc list-inside space-y-1 text-slate-800">
                          {(translatedImportantInfo?.rules ?? importantInfo?.rules ?? []).map((item, idx) => (
                            <li key={`rule-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {((translatedImportantInfo?.other ?? importantInfo?.other) || []).length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-slate-700 mb-1">Other</div>
                        <ul className="list-disc list-inside space-y-1 text-slate-800">
                          {(translatedImportantInfo?.other ?? importantInfo?.other ?? []).map((item, idx) => (
                            <li key={`other-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <button
                onClick={() => setShowSteps((prev) => !prev)}
                className="w-full flex items-center justify-between text-left text-lg font-semibold text-slate-900"
                aria-expanded={showSteps}
              >
                <span className="text-lg font-semibold text-slate-900">Steps to Take</span>
                <span className="text-sm text-slate-500">
                  {showSteps ? "Hide" : "Show"}
                </span>
              </button>
              {showSteps && (
                <div className="mt-3 max-h-40 overflow-auto pr-2 soft-scroll">
                  <ul className="list-disc list-inside space-y-2 text-slate-800">
                    {(translatedFields || formFields).map((field) => (
                      <li key={field.id}>{field.label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => setShowSummary((prev) => !prev)}
                className="w-full flex items-center justify-between text-left text-lg font-semibold text-slate-900"
                aria-expanded={showSummary}
              >
                <span className="text-lg font-semibold text-slate-900">
                  {hasSelectionSummary ? "Select Simplify" : "Document Summary"}
                </span>
                <span className="text-sm text-slate-500">
                  {showSummary ? "Hide" : "Show"}
                </span>
              </button>

              {showSummary && (
                <div className="mt-3 text-slate-700 text-base max-h-48 overflow-auto pr-2 soft-scroll">
                  <blockquote className="border-l-4 border-slate-200 pl-4 italic">
                    {summaryDisplay}
                  </blockquote>
                </div>
              )}
            </div>

            {/* Explain Selection */}
            <div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Explain a Selection</h4>
              <p className="text-sm text-slate-500 mb-3">
                Click Select Text, then drag a rectangle over the PDF.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={startScreenCapture}
                  disabled={!fileURL || isCapturing || selectionLoading}
                  className="px-3 py-1.5 text-sm rounded-md bg-blue-200 text-slate-900 hover:bg-blue-300 disabled:opacity-50"
                >
                  {isCapturing ? "Selecting..." : "Select Text"}
                </button>
                <button
                  onClick={stopScreenCapture}
                  disabled={!isCapturing}
                  className="px-3 py-1.5 text-sm rounded-md bg-white border border-slate-200 text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Language:</span>
                  <select
                    value={summaryLang}
                    onChange={(e) => handleTranslate(e.target.value)}
                    className="border border-slate-200 rounded-md px-2 py-1 text-sm bg-white min-w-[160px]"
                    aria-label="Summary language"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Read aloud:</span>
                  <button
                    onClick={handleAudioButton}
                    className="px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 disabled:opacity-50"
                    aria-label={audioPlaying ? "Stop narration" : "Play narration"}
                  >
                    {audioPlaying ? "Stop" : "Speak"}
                  </button>
                </div>
              </div>

              {selectionLoading && (
                <div className="mt-2 text-sm text-slate-500">Explaining...</div>
              )}
              {selectionTranslating && (
                <div className="mt-2 text-sm text-slate-500">Translating...</div>
              )}
              {selectionError && (
                <div className="mt-2 text-sm text-red-600">{selectionError}</div>
              )}
            </div>
          </div>

        </div>
      )}
    </aside>
  </div>
);

}