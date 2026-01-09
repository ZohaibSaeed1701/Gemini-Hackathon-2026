"use client";

import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function LecturePage() {
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState("");
  const recognitionRef = useRef(null);
  const pdfRef = useRef(null); // Ref for PDF content

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Browser does not support Speech Recognition.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        interimTranscript += event.results[i][0].transcript;
      }
      setTranscript(interimTranscript);
    };

    recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    recognitionRef.current = recognition;
  }, []);

  const startRecording = () => recognitionRef.current?.start();
  const stopRecording = () => recognitionRef.current?.stop();
  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleSubmit = async () => {
    if (!transcript && !file) {
      alert("Please record lecture or upload slides first.");
      return;
    }

    const formData = new FormData();
    formData.append("text", transcript);
    if (file) formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/lecture", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to get response from backend.");
      const data = await res.json();
      setResponse(data.text);
    } catch (err) {
      console.error(err);
      alert("Error sending data to backend.");
    }
  };

  // PDF Download Function
  const downloadPDF = async () => {
    if (!response) return;
    const element = pdfRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("LectureNotes.pdf");
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Teacher Lecture Dashboard</h1>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={startRecording}>Start Recording</button>
        <button onClick={stopRecording} style={{ marginLeft: "1rem" }}>
          Stop Recording
        </button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Live transcript will appear here..."
          rows={8}
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <input type="file" accept=".pdf,.ppt,.pptx" onChange={handleFileChange} />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleSubmit}>Send to AI & Prepare Notes</button>
      </div>

      {response && (
        <div style={{ marginTop: "2rem" }}>
          <h2>AI Generated Lecture (Markdown)</h2>
          <div
            ref={pdfRef}
            style={{
              background: "#f0f0f0",
              padding: "1rem",
              whiteSpace: "pre-wrap",
              fontFamily: "sans-serif",
            }}
          >
            {response}
          </div>
          <button
            onClick={downloadPDF}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}
          >
            Download as PDF
          </button>
        </div>
      )}
    </div>
  );
}
