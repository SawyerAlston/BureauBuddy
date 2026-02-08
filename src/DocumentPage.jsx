import React, { useState } from 'react';

const MOCK_DOCS = [
  {
    id: 1,
    name: 'passport.pdf',
    type: 'application/pdf',
    size: 23456,
    uploadedAt: '2026-02-07',
    blobUrl: '',
  },
  {
    id: 2,
    name: 'tax_form.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 12345,
    uploadedAt: '2026-02-07',
    blobUrl: '',
  },
];

export default function DocumentPage({ fileName, fileURL, summary, formFields, onBack }) {
  const [showInfo, setShowInfo] = useState(false);
  const [documents] = useState(MOCK_DOCS); // Replace with real docs if available

  return (
    <div className="min-h-screen bg-white">
      <div className="h-screen grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Left: PDF-like viewer */}
        <div className="lg:col-span-2 bg-black h-full overflow-hidden">
          <div className="bg-white h-full overflow-auto">
            {fileURL ? (
              <iframe
                src={fileURL}
                className="w-full h-full"
                title="Uploaded Document"
              />
            ) : (
              <div className="p-10">
                <h2 className="text-2xl font-semibold mb-6">This would be the pdf</h2>
                <p className="text-slate-500">No document uploaded.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Explanation and steps */}
        {!showInfo ? (
          <aside className="bg-white h-full p-8 shadow-md flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <button
                className="flex items-center gap-2 text-black text-base font-sans font-bold focus:outline-none"
                onClick={() => setShowInfo(true)}
              >
                My Info
                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="4" y1="12" x2="20" y2="12" stroke="black" strokeWidth="2" />
                    <polyline points="15,6 20,12 15,18" stroke="black" strokeWidth="2" fill="none" />
                  </svg>
                </span>
              </button>
              <button onClick={onBack} className="text-sm text-slate-500 hover:underline">
                Back
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-bold">Simplified Explanation</h3>
                </div>
                <div className="mt-4 text-slate-700 text-base">
                  <blockquote className="border-l-4 border-slate-200 pl-4 italic">{summary}</blockquote>
                </div>
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-3">Requirements</h4>
                  <ul className="list-disc list-inside space-y-2 text-slate-800">
                    <li>Passport</li>
                    <li>Birth Certificate</li>
                    <li>Tax forms</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-8 flex-shrink-0">
              <div className="relative">
                <div className="absolute bottom-3 flex gap-3">
                  <button className="w-16 h-16 text-3xl bg-slate-100 rounded-md flex items-center justify-center">
                    🔊
                  </button>
                  <button className="w-16 h-16 text-xl bg-slate-100 rounded-md flex items-center justify-center">
                    🌐
                  </button>
                </div>
              </div>
            </div>
          </aside>
        ) : (
          <aside className="bg-white h-full p-8 shadow-md flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-base font-bold text-black">My Info</span>
              <button
                className="text-sm text-slate-500 hover:underline"
                onClick={() => setShowInfo(false)}
              >
                Back
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <h3 className="text-xl font-bold mb-4">Uploaded Documents</h3>
              {documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
                      onClick={() => doc.blobUrl && window.open(doc.blobUrl, '_blank')}
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
                            <p className="font-semibold text-slate-900 truncate">
                              {doc.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(doc.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
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
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
