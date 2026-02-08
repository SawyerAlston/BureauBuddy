import React, { useState, useRef } from "react";

export default function DocumentPage({ fileURL, summary, formFields = [], onBack }) {
  const [simplifying, setSimplifying] = useState(false);
  const [showAudioDropdown, setShowAudioDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState(null);
  const [translatedFields, setTranslatedFields] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [simplifiedText, setSimplifiedText] = useState("");
  const [translatedSimplified, setTranslatedSimplified] = useState("");
  const audioRef = useRef(null);

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

  const playTTS = async (speed) => {
    const text = translatedSummary ?? summary;
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

  // Reset to English
  if (langCode === "en") {
    setTranslatedSummary(null);
    setTranslatedFields(null);
    setTranslatedSimplified("");
    return;
  }

  setTranslating(true);

  try {
    // --- Summary ---
    const summaryPromise = fetch("http://localhost:8000/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: summary, target_language: langCode }),
    }).then(res => res.json());

    // --- Fields ---
    const joinedFields = formFields.map(f => f.label).join("\n");
    const fieldsPromise = fetch("http://localhost:8000/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: joinedFields, target_language: langCode }),
    }).then(res => res.json());

    // --- Simplified text (only if it exists) ---
    const simplifiedPromise = simplifiedText
      ? fetch("http://localhost:8000/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: simplifiedText, target_language: langCode }),
        }).then(res => res.json())
      : Promise.resolve(null);

    const [summaryData, fieldsData, simplifiedData] = await Promise.all([
      summaryPromise,
      fieldsPromise,
      simplifiedPromise,
    ]);

    setTranslatedSummary(summaryData.translated_text || summary);

    const translatedLabels = (fieldsData.translated_text || joinedFields).split("\n");
    setTranslatedFields(
      formFields.map((field, i) => ({
        ...field,
        label: translatedLabels[i] || field.label,
      }))
    );

    if (simplifiedData?.translated_text) {
      setTranslatedSimplified(simplifiedData.translated_text);
    } else {
      setTranslatedSimplified("");
    }

  } catch (err) {
    console.error(err);
    setTranslatedSummary("Translation failed.");
    setTranslatedFields(formFields);
    setTranslatedSimplified("");
  } finally {
    setTranslating(false);
  }
};


  const handleSimplifySubmit = async () => {
    if (!textInput.trim()) return;
    setSimplifying(true);
    try {
      const res = await fetch("http://localhost:8000/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_text: textInput,
          document_context: textInput // fallback, or use summary if needed
        }),
      });
      const data = await res.json();
      setSimplifiedText(data.explanation);
      setTextInput("");
    } catch (err) {
      setSimplifiedText("Simplification failed.");
    } finally {
      setSimplifying(false);
    }
  };

  return (
    <div className="h-screen bg-white grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
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

          <div className="mt-8">
            <h4 className="text-lg font-semibold mb-3">Steps to Take</h4>
            <ul className="list-disc list-inside space-y-2 text-slate-800">
              {(translatedFields || formFields).map((field) => (
                <li key={field.id}>{field.label}</li>
              ))}
            </ul>
          </div>

          {/* Show simplified/translated text as heading below steps to take */}
          {(simplifiedText || translatedSimplified) && (
            <div className="mt-8">
              <h4 className="text-lg font-semibold mb-2">Simplified Text</h4>
              <div className="text-base text-slate-700 whitespace-pre-line">
                {translatedSimplified || simplifiedText}
              </div>
            </div>
          )}


        </div>

        {/* Bottom buttons */}
        <div className="mt-6 flex gap-3 relative justify-between items-center">
          <button
            className="w-16 h-16 text-3xl bg-slate-100 rounded-md grid place-items-center"
            onClick={handleAudioButton}
            id="audio-btn"
            aria-label={audioPlaying ? "Pause audio" : "Play audio"}
          >
            {audioPlaying ? "⏹" : "🔊"}
          </button>

            <div className="relative w-72">
              {simplifying && (
                <div className="mb-1 text-xs text-blue-600 font-semibold text-center">Processing...</div>
              )}
              <textarea
                placeholder="Paste text here for clarification"
                className="border border-slate-300 rounded px-2 py-1 w-full h-20 text-base resize-none pr-8"
                style={{ height: "5rem" }}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSimplifySubmit();
                  }
                }}
                disabled={simplifying}
              />

              <button
                className="absolute bottom-3 right-2 w-6 h-6 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center text-slate-700 text-sm"
                aria-label="Submit"
                onClick={handleSimplifySubmit}
              >
                ↑
              </button>
              {/* No simplified/translated text here; moved below steps to take */}
            </div>

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