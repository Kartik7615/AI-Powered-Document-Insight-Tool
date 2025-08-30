import { useEffect, useState } from "react";
import { uploadResume, getHistory, getInsights } from "./api";

type View = "upload" | "history" | "detail";

export default function App() {
  const [view, setView] = useState<View>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<string>("");

  const refreshHistory = async () => {
    const h = await getHistory();
    setHistory(h);
  };

  useEffect(() => { refreshHistory(); }, []);

const onUpload = async () => {
  if (!file) return;
  setStatus("Uploading...");
  try {
    const data = await uploadResume(file);
    if (!data) throw new Error("No response from server");
    setResult(data);
    setCurrentId(data.document_id);
    setView("detail");
    setStatus("");
    await refreshHistory();
  } catch (e: any) {
    console.error("Upload error:", e);
    setStatus("❌ Upload failed. Backend not reachable.");
  }
};


  const openDetail = async (id: string) => {
    setStatus("Loading...");
    const data = await getInsights(id);
    setResult(data);
    setCurrentId(id);
    setView("detail");
    setStatus("");
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">AI-Powered Document Insight Tool</h1>
        <nav className="flex gap-3">
          <button className="px-3 py-1 rounded bg-gray-200" onClick={() => setView("upload")}>Upload</button>
          <button className="px-3 py-1 rounded bg-gray-200" onClick={() => setView("history")}>History</button>
        </nav>
      </header>

      {view === "upload" && (
        <div className="space-y-4">
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="px-4 py-2 rounded bg-black text-white" onClick={onUpload} disabled={!file}>
            Upload & Analyze
          </button>
          {status && <p>{status}</p>}
        </div>
      )}

      {view === "history" && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Uploaded Documents</h2>
          <ul className="divide-y">
            {history.map((h) => (
              <li key={h.id} className="py-2 flex justify-between">
                <span>{h.filename}</span>
                <button className="underline" onClick={() => openDetail(h.id)}>View Insights</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === "detail" && result && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Insights</h2>
          {"summary" in result.payload ? (
            <div className="p-4 rounded border">
              <h3 className="font-medium mb-1">AI Summary</h3>
              <p>{result.payload.summary}</p>
            </div>
          ) : (
            <div className="p-4 rounded border">
              <h3 className="font-medium mb-1">Fallback: Top 5 Words</h3>
              <ul className="list-disc ml-6">
                {result.payload.top5?.map((w: any) => (
                  <li key={w.word}>{w.word} — {w.count}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-sm text-gray-600">Document ID: {currentId}</div>
          {status && <p>{status}</p>}
        </div>
      )}
    </div>
  );
}
