const BASE = import.meta.env.VITE_API_BASE;

export async function uploadResume(file: File) {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/upload-resume`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error("Upload failed");
    return await res.json();
  } catch (err) {
    console.error("uploadResume error:", err);
    throw err;
  }
}

export async function getHistory() {
  try {
    const res = await fetch(`${BASE}/history`);
    if (!res.ok) throw new Error("History fetch failed");
    return await res.json();
  } catch (err) {
    console.error("getHistory error:", err);
    return []; // 👈 crash ke bajaye empty list bhej do
  }
}

export async function getInsights(id: string) {
  try {
    const res = await fetch(`${BASE}/insights/${id}`);
    if (!res.ok) throw new Error("Insights fetch failed");
    return await res.json();
  } catch (err) {
    console.error("getInsights error:", err);
    return { payload: { summary: "❌ Backend not reachable" } }; // 👈 fallback
  }
}
