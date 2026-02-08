import React, { useState, useRef, useEffect } from "react";

export default function DocumentPage({
  fileURL,
  summary,
  importantInfo,
  formFields = [],
  onBack,
  isProcessing,
}) {
  const [showAudioDropdown, setShowAudioDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState(null);
  const [translatedFields, setTranslatedFields] = useState(null);
  const [translatedImportantInfo, setTranslatedImportantInfo] = useState(null);
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
  const [showImportantInfo, setShowImportantInfo] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
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
      setTranslatedImportantInfo(null);
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
      setSummaryDraft("");
      setSummaryDraftError("");
    } catch (err) {
      setTranslatedSummary("Translation failed.");
      setTranslatedFields(formFields);
      setTranslatedImportantInfo(null);
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

  const buildDocumentContext = () => {
    const parts = [];
    if (summary) parts.push(`Summary: ${summary}`);
    if (formFields?.length) {
      parts.push(`Requirements: ${formFields.map((f) => f.label).join("; ")}`);
    }
    if (importantInfo) {
      if (importantInfo.deadlines?.length) {
        parts.push(`Deadlines: ${importantInfo.deadlines.join("; ")}`);
      }
      if (importantInfo.notices?.length) {
        parts.push(`Notices: ${importantInfo.notices.join("; ")}`);
      }
      if (importantInfo.rules?.length) {
        parts.push(`Rules: ${importantInfo.rules.join("; ")}`);
      }
      if (importantInfo.other?.length) {
        parts.push(`Other: ${importantInfo.other.join("; ")}`);
      }
    }
    return parts.join("\n");
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);
    setChatError("");
    try {
      const context = buildDocumentContext();
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          document_context: context,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }
      const data = await response.json();
      const answer = data.answer || "No answer returned.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      console.error(err);
      setChatError("Failed to get an answer.");
    } finally {
      setChatLoading(false);
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
    <aside className="h-full bg-white p-8 shadow-md flex flex-col overflow-hidden">
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable content */}
          <div className="flex-1 overflow-auto">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold">Document Summary</h3>
              <button onClick={onBack} className="text-sm text-slate-500 hover:underline">
                Back
              </button>
            </div>

            <div className="mt-4 text-slate-700 text-base">
              <blockquote className="border-l-4 border-slate-200 pl-4 italic">
                {translating ? "Translating..." : translatedSummary || summary}
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

            {summaryDraftError && (
              <div className="mt-2 text-sm text-red-600">{summaryDraftError}</div>
            )}

            {summaryDraft && (
              <div className="mt-3 text-slate-700 text-base">
                <div className="text-sm font-semibold text-slate-700 mb-1">Draft</div>
                <blockquote className="border-l-4 border-slate-200 pl-4 italic whitespace-pre-wrap">
                  {summaryDraft}
                </blockquote>
              </div>
            )}

            <div className="mt-8">
              <h4 className="text-lg font-semibold mb-3">Steps to Take</h4>
              <ul className="list-disc list-inside space-y-2 text-slate-800">
                {(translatedFields || formFields).map((field) => (
                  <li key={field.id}>{field.label}</li>
                ))}
              </ul>
            </div>

            {(translatedImportantInfo || importantInfo) && (
              <div className="mt-8">
                <button
                  onClick={() => setShowImportantInfo((prev) => !prev)}
                  className="w-full flex items-center justify-between text-left text-lg font-semibold text-slate-900"
                  aria-expanded={showImportantInfo}
                >
                  <span>Expanded Info</span>
                  <span className="text-sm text-slate-500">
                    {showImportantInfo ? "Hide" : "Show"}
                  </span>
                </button>

                {showImportantInfo && (
                  <div className="mt-3">
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

            {/* Explain Selection */}
            <div className="mt-8">
              <h4 className="text-lg font-semibold mb-2">Explain a Selection</h4>
              <p className="text-sm text-slate-500 mb-3">
                Click Select Text, then drag a rectangle over the PDF.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={startScreenCapture}
                  disabled={!fileURL || isCapturing || selectionLoading}
                  className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white disabled:opacity-50"
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
                    playTTSForText(selectionTranslated || selectionExplanation, 1)
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

              {selectionLoading && (
                <div className="mt-2 text-sm text-slate-500">Explaining...</div>
              )}
              {selectionTranslating && (
                <div className="mt-2 text-sm text-slate-500">Translating...</div>
              )}
              {selectionError && (
                <div className="mt-2 text-sm text-red-600">{selectionError}</div>
              )}
              {selectionExplanation && (
                <div className="mt-3 text-slate-700 text-base">
                  {Array.isArray(selectionTranslated || selectionExplanation) ? (
                    <div className="space-y-3">
                      {(selectionTranslated || selectionExplanation).map((item, idx) => {
                        if (typeof item === 'string') {
                          return (
                            <blockquote key={idx} className="border-l-4 border-slate-200 pl-4 italic">
                              {item}
                            </blockquote>
                          );
                        } else if (item && typeof item === 'object') {
                          return (
                            <div key={idx} className="border-l-4 border-slate-200 pl-4">
                              {item.part && (
                                <div className="font-semibold mb-1">{item.part}</div>
                              )}
                              {item.simple_explanation && (
                                <div className="italic">{item.simple_explanation}</div>
                              )}
                            </div>
                          );
                        } else {
                          return null;
                        }
                      })}
                    </div>
                  ) : (
                    <blockquote className="border-l-4 border-slate-200 pl-4 italic">
                      {selectionTranslated || selectionExplanation}
                    </blockquote>
                  )}
                </div>
              )}
              {selectionActionsError && (
                <div className="mt-2 text-sm text-red-600">{selectionActionsError}</div>
              )}
              {selectionActions.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-semibold text-slate-700 mb-1">Actions</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                    {selectionActions.map((step, idx) => (
                      <li key={`${step}-${idx}`}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Ask an Expert */}
            <div className="mt-10">
              <h4 className="text-lg font-semibold mb-2">Ask an Expert</h4>
              <p className="text-sm text-slate-500 mb-3">
                Ask questions about the document and get an expert response.
              </p>
              <div className="border border-slate-200 rounded-md bg-white">
                <div className="max-h-48 overflow-auto p-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-sm text-slate-500">
                      No messages yet. Ask a question below.
                    </div>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={`${msg.role}-${idx}`}
                      className={
                        msg.role === "user"
                          ? "text-sm text-slate-900 text-right"
                          : "text-sm text-slate-700 text-left"
                      }
                    >
                      <div
                        className={
                          msg.role === "user"
                            ? "inline-block bg-slate-100 px-3 py-2 rounded-lg"
                            : "inline-block bg-blue-50 px-3 py-2 rounded-lg"
                        }
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 p-3 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSend();
                      }
                    }}
                    placeholder="Ask a question..."
                    className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-3 py-2 text-sm rounded-md bg-slate-900 text-white disabled:opacity-50"
                  >
                    {chatLoading ? "Sending..." : "Send"}
                  </button>
                </div>
                {chatError && (
                  <div className="mt-2 text-sm text-red-600">{chatError}</div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom buttons */}
          <div className="mt-6 flex gap-3 relative">
            <button
              className="w-16 h-16 text-3xl bg-slate-100 rounded-md grid place-items-center"
              onClick={handleAudioButton}
              aria-label={audioPlaying ? "Pause audio" : "Play audio"}
            >
              {audioPlaying ? "⏹" : "🔊"}
            </button>
            <button
              className="w-16 h-16 text-xl bg-slate-100 rounded-md grid place-items-center"
              onClick={() => setShowLangDropdown((prev) => !prev)}
            >
              🌐
            </button>

            {showAudioDropdown && (
              <div className="absolute bottom-20 left-0 bg-white border border-slate-200 rounded-md shadow-lg p-3 w-40 z-10">
                <div className="font-semibold mb-2 text-sm text-slate-700">Audio Speed</div>
                <ul className="space-y-1">
                  {AUDIO_SPEEDS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded"
                        onClick={() => handleAudioSpeed(opt.value)}
                      >
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
                      <button
                        className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded"
                        onClick={() => handleTranslate(lang.code)}
                      >
                        {lang.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  </div>
);

}