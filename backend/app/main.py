import os
import re
import requests
from collections import Counter
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, create_engine, Session, select
from dotenv import load_dotenv
from PyPDF2 import PdfReader

# 🔹 Load .env variables
load_dotenv()

# ======================================
# 🚀 FastAPI App Config
# ======================================
app = FastAPI(title="AI-Powered Document Insight Tool")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # production me specific domain dena
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================
# 🚀 Database Config
# ======================================
DATABASE_URL = "sqlite:///./insights.db"
engine = create_engine(DATABASE_URL, echo=False)

class Insight(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    summary: str

SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# ======================================
# 🚀 Sarvam AI Client
# ======================================
class SarvamClient:
    def __init__(self):
        self.api_key = os.getenv("sk_as428jzk", "").strip()
        self.url = os.getenv("https://api.sarvam.ai/v1/summarize", "").strip()
        self.enabled = bool(self.api_key and self.url)

    def summarize(self, text: str) -> Optional[str]:
        if not self.enabled:
            return None
        try:
            resp = requests.post(
                self.url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"text": text},
                timeout=20
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("summary") or data.get("result") or None
        except Exception as e:
            print("Sarvam API error:", e)
            return None

sarvam = SarvamClient()

# ======================================
# 🚀 Helpers
# ======================================
def extract_text_from_pdf(file: UploadFile) -> str:
    """Extract plain text from PDF"""
    reader = PdfReader(file.file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text.strip()

def get_frequent_words(text: str, n=5) -> str:
    words = re.findall(r"\b\w+\b", text.lower())
    common = Counter(words).most_common(n)
    return ", ".join([f"{w}({c})" for w, c in common])

# ======================================
# 🚀 Routes
# ======================================
@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...), session: Session = Depends(get_session)):
    try:
        # 1. Extract text
        text = extract_text_from_pdf(file)
        if not text:
            raise HTTPException(status_code=400, detail="No text found in PDF")

        # 2. Try Sarvam AI
        summary = sarvam.summarize(text)

        # 3. If AI not available → fallback
        if not summary:
            summary = f"(Fallback) Frequent words: {get_frequent_words(text)}"

        # 4. Save in DB
        insight = Insight(filename=file.filename, summary=summary)
        session.add(insight)
        session.commit()
        session.refresh(insight)

        return {"id": insight.id, "filename": file.filename, "summary": summary}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/history", response_model=List[Insight])
def get_history(session: Session = Depends(get_session)):
    return session.exec(select(Insight)).all()


@app.get("/insights/{doc_id}")
def get_insight(doc_id: int, session: Session = Depends(get_session)):
    insight = session.get(Insight, doc_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Document not found")
    return insight


@app.get("/")
def root():
    return {"message": "AI Document Insight API is running ✅"}
