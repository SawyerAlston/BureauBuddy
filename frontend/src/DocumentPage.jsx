import React, { useState } from "react";

export default function DocumentPage({ fileURL, summary, formFields = [], onBack }) {
  const [showAudioDropdown, setShowAudioDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState(null);
  const [translatedFields, setTranslatedFields] = useState(null);

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

  const handleAudioSpeed = (speed) => {
    // Implement audio speed change logic here
    setShowAudioDropdown(false);
  };

  const handleTranslate = async (langCode) => {
    setShowLangDropdown(false);
    if (langCode === "en") {
      setTranslatedSummary(null);
      setTranslatedFields(null);
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
    } catch (err) {
      setTranslatedSummary("Translation failed.");
      setTranslatedFields(formFields);
    } finally {
      setTranslating(false);
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

        </div>

        {/* Bottom buttons */}
        <div className="mt-6 flex gap-3 relative">
          <button
            className="w-16 h-16 text-3xl bg-slate-100 rounded-md grid place-items-center"
            onClick={() => setShowAudioDropdown((prev) => !prev)}
            id="audio-btn"
          >
            🔊
          </button>
          <button className="w-16 h-16 text-xl bg-slate-100 rounded-md grid place-items-center" onClick={() => setShowLangDropdown((prev) => !prev)}>
            🌐
          </button>
          {showAudioDropdown && (
            <div className="absolute bottom-20 left-0 bg-white border border-slate-200 rounded-md shadow-lg p-3 w-40 z-10">
              <div className="font-semibold mb-2 text-sm text-slate-700">Audio Speed</div>
              <ul className="space-y-1">
                <li>
                  <button className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded" onClick={() => handleAudioSpeed(0.5)}>
                    0.5x
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded" onClick={() => handleAudioSpeed(1)}>
                    1x (Normal)
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded" onClick={() => handleAudioSpeed(1.5)}>
                    1.5x
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded" onClick={() => handleAudioSpeed(2)}>
                    2x
                  </button>
                </li>
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