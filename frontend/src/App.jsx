import React, { useState, useRef } from 'react';
import DocumentPage from './DocumentPage';
import uploadDocPng from './uploadDoc.png';
import { features } from './features';

export default function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);
  const [summary, setSummary] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState('home'); // 'home' | 'viewer' 

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
  } catch (err) {
    console.error(err);
    setSummary("Error analyzing document.");
    setFormFields([]);
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
    processDocument(file);
  };

  const handleBack = () => {
    setView('home');
    setSummary('');
    setFormFields([]);
    setUploadedFile(null);
    if (fileURL) URL.revokeObjectURL(fileURL);
    setFileURL(null);
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-16 w-16 text-blue-500 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <h2 className="text-2xl font-semibold text-slate-700 mb-2">Uploading and analyzing your document...</h2>
          <p className="text-slate-500">This may take a few moments. Please wait.</p>
        </div>
      </div>
    );
  }

  if (view === 'viewer') {
    return (
      <DocumentPage
        fileName={uploadedFile}
        fileURL={fileURL}
        summary={summary}
        formFields={formFields}
        onBack={handleBack}
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
      <section className="flex justify-center items-center py-20 px-8">
        <p className="max-w-3xl text-center text-xl text-slate-800 leading-relaxed">
          Need help understanding complex government forms and legal documents? We’ve got you covered! Upload your form to our agent and we will help you understand the exact process you need to complete this task!
        </p>
      </section>
      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-indigo-50 to-blue-100">
        <h2 className="text-4xl font-extrabold text-center text-slate-900 mb-12">Features</h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
          {features.map(({ icon: Icon, title, description }, idx) => (
            <div
              key={title}
              className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center hover:scale-105 transition-transform duration-300 animate-bounce-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <span className="mb-4 text-indigo-500">
                <Icon size={56} />
              </span>
              <h3 className="text-2xl font-bold mb-2">{title}</h3>
              <p className="text-slate-600 text-lg">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}