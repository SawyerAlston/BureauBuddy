import React, { useState } from "react";

export default function DocumentPage({ fileURL, summary, formFields = [], onBack }) {
  const [showAudioDropdown, setShowAudioDropdown] = useState(false);

  const handleAudioSpeed = (speed) => {
    // Implement audio speed change logic here
    setShowAudioDropdown(false);
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
              {summary}
            </blockquote>
          </div>

          <div className="mt-8">
            <h4 className="text-lg font-semibold mb-3">Requirements</h4>
            <ul className="list-disc list-inside space-y-2 text-slate-800">
              {formFields.map((field) => (
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
          <button className="w-16 h-16 text-xl bg-slate-100 rounded-md grid place-items-center">
            🌐
          </button>
          {showAudioDropdown && (
            <div
              className="absolute z-10 bg-white border border-slate-300 rounded-md shadow-lg p-2 w-40"
              style={{ left: "-10px", bottom: "70px" }}
            >
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
        </div>
      </aside>
    </div>
  );
}