from google import genai
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from PyPDF2 import PdfReader
import os
from dotenv import load_dotenv
import os

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API"))

embed_model = SentenceTransformer("all-MiniLM-L6-v2")

def load_text(file_path: str) -> str:
    if file_path.endswith(".pdf"):
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    else:  # default to txt
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

def process_and_answer(file_path: str, question: str) -> str:
    text = load_text(file_path)

    # Chunking
    chunks = []
    chunk_size = 500
    for i in range(0, len(text), chunk_size):
        chunks.append(text[i:i + chunk_size])

    # Embeddings
    embeddings = embed_model.encode(chunks)
    embeddings = np.array(embeddings).astype("float32")

    # FAISS index
    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(embeddings)

    # Question embedding
    q_embedding = embed_model.encode([question]).astype("float32")
    _, indices = index.search(q_embedding, 3)

    context = " ".join([chunks[i] for i in indices[0]])

    prompt = f"""
You are a student assistant.
Answer strictly from the teacher notes.
Keep the answer short and clear.

Teacher Notes:
{context}

Question:
{question}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text
