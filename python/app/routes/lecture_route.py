from fastapi import APIRouter, UploadFile, File, Form
import shutil, json, os
from app.utils.sentence_util import paragraph_to_sentences
from app.utils.summary_util import get_short_summary
from app.utils.file_loader_util import load_pdf, load_ppt
from app.utils.professor_summary_util import generate_professor_summary
from app.utils.refine_text_util import llm_refine_text
from app.utils.first_notes_util import generate_final_lecture_notes
from app.utils.convert_notes_into_markdown_util import convert_notes_to_markdown
from app.utils.chat_with_notes_util import process_and_answer

router = APIRouter()

@router.post("/lecture")
async def clean_lecture_text(
    text: str = Form(""), 
    file: UploadFile | None = File(None)  # File optional
):
    """
    Process lecture text + optional PDF/PPT,
    clean, summarize, refine, and return final notes in Markdown.
    """

    lecture_text = text
    try:
        # Agar text JSON format me hai
        data = json.loads(text)
        lecture_text = data.get("text", "")
    except json.JSONDecodeError:
        pass  # Agar JSON nahi, text directly use hoga

    raw_text = ""
    if file:
        path = f"temp_{file.filename}"
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # File type check
        if file.filename.endswith(".pdf"):
            raw_text = load_pdf(path)
        elif file.filename.endswith(".pptx") or file.filename.endswith(".ppt"):
            raw_text = load_ppt(path)
        else:
            return {"status": 400, "message": "Unsupported file type"}

        os.remove(path)  # Temporary file remove

    # Paragraphs ko sentences me convert karna
    clean_data = paragraph_to_sentences(lecture_text)

    # Short summary
    text_for_summary = " ".join(clean_data)
    summary_from_qroq = get_short_summary(text_for_summary)

    # LLM se refined text
    refined_text = llm_refine_text(raw_text)

    # Professor style lecture notes
    lecture_notes = generate_professor_summary(refined_text)

    # Final notes prepare karna
    lecture_prepared = generate_final_lecture_notes(lecture_notes, summary_from_qroq)

    # Markdown me convert karna
    final_answer = convert_notes_to_markdown(lecture_prepared)

    return {"status": 200, "text": final_answer}



@router.post("/chat-with-notes")
async def chat_with_notes(
    file: UploadFile = File(...),
    question: str = Form(...)
):
    os.makedirs("temp", exist_ok=True)

    file_path = f"temp/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())

    answer = process_and_answer(file_path, question)

    return {"status": 200, "answer": answer}