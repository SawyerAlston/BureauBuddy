import React, { useState, useRef } from 'react';
import DocumentPage from './DocumentPage';
import AccountPage from './AccountPage';

export default function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);
  const [summary, setSummary] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState('home'); // 'home' | 'viewer' | 'account'

  const fileInputRef = useRef(null);

  const processDocument = async (fileName) => {
    setIsProcessing(true);

    await new Promise((r) => setTimeout(r, 1000));

    const mockSummaries = {
      default:
        'This document outlines important procedures and requirements that need to be understood and completed. The document contains several sections with specific guidelines and instructions that must be followed carefully. Each section requires attention to detail and proper completion of designated fields to ensure compliance with regulations.',
    };

    setSummary(mockSummaries.default);

    setFormFields([
      { id: 1, label: 'Full Legal Name' },
      { id: 2, label: 'Date of Birth' },
    ]);

    setIsProcessing(false);
    setView('viewer');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file.name);
    const url = URL.createObjectURL(file);
    setFileURL(url);
    processDocument(file.name);
  };

  const handleBack = () => {
    setView('home');
    setSummary('');
    setFormFields([]);
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
        formFields={formFields}
        onBack={handleBack}
      />
    );
  }

  if (view === 'account') {
    return <AccountPage onNavigate={setView} />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="shadow-md" style={{ backgroundColor: '#238AFF' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-4">
          <button
            onClick={() => setView('home')}
            className="text-2xl font-bold text-slate-900 hover:text-black text-white"
          >
            BureauBuddy
          </button>
          <ul className="flex gap-8 items-center">
            <li>
              <button
                onClick={() => setView('account')}
                className="text-slate-700 hover:text-black font-medium text-white"
              >
                Account
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* hidden file input used by hero button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.docx"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hero Section */}
      <section className="bg-blue-300 min-h-[70vh] flex items-center">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 w-full">
          <h1 className="text-[5.5rem] md:text-[9rem] font-extrabold leading-none text-slate-900">
            Bureau<br />Buddy
          </h1>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-neutral-800 text-white text-xl px-8 md:px-10 py-5 md:py-6 rounded-lg shadow-lg"
          >
            Upload Document
          </button>
        </div>
      </section>

      {/* Description Section */}
      <section className="flex justify-center items-center py-20 px-8">
        <p className="max-w-3xl text-center text-xl text-slate-800 leading-relaxed">
          Need help understanding complex government forms and legal documents? We’ve got you covered! Upload your form to our agent and we will help you understand the exact process you need to complete this task!
        </p>
      </section>
    </div>
  );
}
