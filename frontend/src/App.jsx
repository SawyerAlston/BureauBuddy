import React, { useState, useRef } from 'react';
import DocumentPage from './DocumentPage';
import uploadDocPng from './uploadDoc.png';
import { features } from './features';

export default function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);
  const [summary, setSummary] = useState('');
  const [importantInfo, setImportantInfo] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState('home'); // 'home' | 'viewer' 

  const featureCount = features.length;
  const featureRemainder = featureCount % 3;

  const fileInputRef = useRef(null);

  const processDocument = async (file) => {
  setIsProcessing(true);
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://localhost:8000/analyze_doc/upload", {
      method: "POST",
      body: formData, // multipart/form-data is automatically set by browser
    });

    if (!response.ok) throw new Error("Failed to analyze document");

    const data = await response.json();

    setSummary(data.summary || "No summary available.");
    setFormFields(
      (data.requirements || []).map((req, idx) => ({ id: idx + 1, label: req }))
    );

    const contextText = (data.transcribed_text || data.summary || "").trim();
    if (contextText) {
      try {
        const infoResponse = await fetch("http://localhost:8000/important_info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_context: contextText }),
        });
        if (infoResponse.ok) {
          const infoData = await infoResponse.json();
          setImportantInfo(infoData);
        } else {
          setImportantInfo(null);
        }
      } catch (err) {
        console.error(err);
        setImportantInfo(null);
      }
    } else {
      setImportantInfo(null);
    }
  } catch (err) {
    console.error(err);
    setSummary("Error analyzing document.");
    setFormFields([]);
    setImportantInfo(null);
  } finally {
    setIsProcessing(false);
    setView("viewer");
  }
};


  const handleFileChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploadedFile(file.name);
  const url = URL.createObjectURL(file);
  setFileURL(url);

  setView("viewer");        // 👈 show viewer immediately
  processDocument(file);    // analysis happens in background
};


  const handleBack = () => {
    setView('home');
    setSummary('');
    setFormFields([]);
    setImportantInfo(null);
    setUploadedFile(null);
    if (fileURL) URL.revokeObjectURL(fileURL);
    setFileURL(null);
  };

  if (view === 'viewer') {
    return (
      <DocumentPage
        fileName={uploadedFile}
        fileURL={fileURL}
        summary={summary}
        importantInfo={importantInfo}
        formFields={formFields}
        onBack={handleBack}
        isProcessing={isProcessing}
      />
    );
  }


  return (
    <div className="min-h-screen bg-white">
      {/* hidden file input used by hero button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.docx"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden
        bg-gradient-to-br from-blue-200 via-blue-300 to-indigo-200">

        {/* Subtle grain / noise */}
        <div className="pointer-events-none absolute inset-0
          bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.15)_1px,transparent_0)]
          bg-[size:16px_16px] opacity-10" />

        {/* Soft abstract shape */}
        <div className="pointer-events-none absolute -top-40 -left-40
          w-[520px] h-[520px] rounded-full
          bg-white/30 blur-3xl" />

        <div className="relative max-w-5xl mx-auto flex items-center justify-between px-8 w-full">
          <h1 className="text-[5.5rem] md:text-[9rem] font-extrabold leading-none text-slate-900">
            Bureau<br />Buddy
          </h1>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-0 bg-transparent border-none shadow-none hover:scale-[1.02] transition-transform"
            style={{ width: 'auto', height: 'auto' }}
          >
            <img
              src={uploadDocPng}
              alt="Upload Document"
              style={{ width: 300, height: 300, objectFit: 'contain', display: 'block' }}
            />
          </button>

        </div>
      </section>


      {/* Description Section */}
      <section className="flex flex-col items-center pt-12 pb-20 px-0 gap-10">
        <div className="w-full px-8">
          <div className="logo-marquee rounded-none sm:rounded-2xl bg-white/70 backdrop-blur border-y border-slate-200 sm:border-x py-4">
            <div className="logo-marquee-track gap-8 px-8">
              {[
                { code: "es", label: "Spanish", flag: "🇪🇸" },
                { code: "fr", label: "French", flag: "🇫🇷" },
                { code: "de", label: "German", flag: "🇩🇪" },
                { code: "zh", label: "Chinese", flag: "🇨🇳" },
                { code: "hi", label: "Hindi", flag: "🇮🇳" },
                { code: "ar", label: "Arabic", flag: "🇸🇦" },
                { code: "ru", label: "Russian", flag: "🇷🇺" },
                { code: "ja", label: "Japanese", flag: "🇯🇵" },
                { code: "pt", label: "Portuguese", flag: "🇵🇹" },
                { code: "en", label: "English", flag: "🇺🇸" },
              ]
                .concat([
                  { code: "es", label: "Spanish", flag: "🇪🇸" },
                  { code: "fr", label: "French", flag: "🇫🇷" },
                  { code: "de", label: "German", flag: "🇩🇪" },
                  { code: "zh", label: "Chinese", flag: "🇨🇳" },
                  { code: "hi", label: "Hindi", flag: "🇮🇳" },
                  { code: "ar", label: "Arabic", flag: "🇸🇦" },
                  { code: "ru", label: "Russian", flag: "🇷🇺" },
                  { code: "ja", label: "Japanese", flag: "🇯🇵" },
                  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
                  { code: "en", label: "English", flag: "🇺🇸" },
                ])
                .map((lang, idx) => (
                  <div
                    key={`${lang.code}-${idx}`}
                    className="flex items-center justify-center gap-2 min-w-[170px] h-14 rounded-xl bg-white shadow-sm border border-slate-200 text-slate-700 font-semibold tracking-wide"
                  >
                    <span className="text-2xl" aria-hidden="true">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <p className="max-w-3xl text-center text-xl text-slate-800 leading-relaxed">
          Need help understanding complex government forms and legal documents? We’ve got you covered! Upload your form to our agent and we will help you understand the exact process you need to complete this task!
        </p>
        <div className="w-40 h-1 rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-300" />
      </section>
      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-indigo-50 to-blue-100">
        <h2 className="text-4xl font-extrabold text-center text-slate-900 mb-12">Features</h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-10">
          {features.map(({ icon: Icon, title, description }, idx) => {
            const isCenteredPairStart = featureRemainder === 2 && idx === featureCount - 2;
            const isCenteredSingle = featureRemainder === 1 && idx === featureCount - 1;

            return (
              <div
                key={title}
                className={`md:col-span-2 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center hover:scale-105 transition-transform duration-300 animate-bounce-in ${
                  isCenteredPairStart
                    ? "md:col-start-2"
                    : isCenteredSingle
                    ? "md:col-start-3"
                    : ""
                }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
              <span className="mb-4 text-indigo-500">
                <Icon size={56} />
              </span>
              <h3 className="text-2xl font-bold mb-2">{title}</h3>
              <p className="text-slate-600 text-lg">{description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}