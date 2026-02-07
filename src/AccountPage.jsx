import React, { useState, useRef } from 'react';

export default function AccountPage({ onNavigate }) {
  const [documents, setDocuments] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const blobUrl = URL.createObjectURL(file);
      setDocuments((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toLocaleDateString(),
          blobUrl,
        },
      ]);
    });
  };

  const handleRemoveDocument = (id) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="shadow-md" style={{ backgroundColor: '#238AFF' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-4">
          <button
            onClick={() => onNavigate('home')}
            className="text-2xl font-bold text-slate-900 hover:text-black text-white"
          >
            BureauBuddy
          </button>
          <ul className="flex gap-8 items-center">
            <li>
              <button
                onClick={() => onNavigate('account')}
                className="text-slate-700 hover:text-black font-medium text-white"
              >
                Welcome Account!
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Account Content */}
      <section className="max-w-5xl mx-auto py-12 px-8 space-y-8">

        {/* Document Upload Section */}
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Uploaded Documents</h2>

          {/* Upload Button */}
          <div className="mb-8">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.pdf,.docx,.doc"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <span className="text-xl">📤</span>
              Upload Document
            </button>
          </div>

          {/* Document Previews */}
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-2xl">
                        {doc.type.includes('pdf')
                          ? '📄'
                          : doc.type.includes('word')
                          ? '📝'
                          : '📋'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate"
                        onClick={() => window.open(doc.blobUrl, '_blank')}>
                          {doc.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(doc.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDocument(doc.id)}
                      className="text-red-500 hover:text-red-700 font-bold ml-2"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Uploaded: {doc.uploadedAt}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg">
              <p className="text-slate-500 text-lg">No documents uploaded yet</p>
              <p className="text-slate-400 text-sm mt-2">
                Click the button above to upload your first document
              </p>
            </div>
          )}
      </section>
    </div>
  );
}
