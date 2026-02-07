import React from 'react';

export default function DocumentPage({ fileName, fileURL, summary, formFields, onBack }) {
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
        <aside className="bg-white h-full p-8 shadow-md flex flex-col">
          <div className="flex-1 overflow-auto">
            <div>
              <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold">Document Explanation</h3>
              <button onClick={onBack} className="text-sm text-slate-500 hover:underline">Back</button>
            </div>

            <div className="mt-4 text-slate-700 text-sm">
              <blockquote className="border-l-4 border-slate-200 pl-4 italic">{summary}</blockquote>
            </div>

            <div className="mt-8">
              <h4 className="text-lg font-semibold mb-3">Step By Step</h4>
              <ul className="list-disc list-inside space-y-2 text-slate-800">
                <li>
                  Step 1
                  <ul className="list-disc list-inside ml-6 mt-2">
                    <li>Sub step</li>
                    <li>sub step</li>
                  </ul>
                </li>
                <li>
                  Step 2
                  <ul className="list-disc list-inside ml-6 mt-2">
                    <li>sub step</li>
                  </ul>
                </li>
              </ul>
            </div>
            </div>
          </div>

          <div className="mt-8 flex-shrink-0">
            <div className="relative">
              <textarea placeholder="Type Here!" className="w-full p-4 rounded-lg border border-slate-200 min-h-[80px] resize-none" />
              <div className="absolute right-3 bottom-3 flex gap-3">
                <button className="p-2 bg-slate-100 rounded-md">🔊</button>
                <button className="p-2 bg-slate-100 rounded-md">G</button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
