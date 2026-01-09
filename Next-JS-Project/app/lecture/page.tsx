"use client";
import { useState, useEffect, useRef } from "react";
import MarkdownIt from "markdown-it";
import katex from "katex";
import "katex/dist/katex.min.css";

// Type declarations for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type FileEvent = React.ChangeEvent<HTMLInputElement>;

export default function LecturePage() {
  const [transcript, setTranscript] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<string>("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const md = new MarkdownIt();

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        interimTranscript += event.results[i][0].transcript;
      }
      setTranscript(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      // Stop recognition on error
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };

    recognitionRef.current = recognition;

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start recording:", err);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Failed to stop recording:", err);
      }
    }
  };

  const handleFileChange = (e: FileEvent) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!transcript.trim() && !file) {
      alert("Please record lecture or upload slides first.");
      return;
    }

    const formData = new FormData();
    if (transcript.trim()) {
      formData.append("text", transcript);
    }
    if (file) {
      formData.append("file", file);
    }

    try {
      const res = await fetch("http://localhost:8000/lecture", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Failed to get response from backend. Status: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data.text || data.content || "");
    } catch (err: any) {
      console.error(err);
      alert(`Error sending data to backend: ${err.message}`);
    }
  };

  const downloadPDF = async () => {
    if (!response.trim()) {
      alert("No notes available!");
      return;
    }

    setIsGeneratingPDF(true);

    try {
      // Dynamically import html2pdf ONLY on client-side
      const html2pdf = (await import("html2pdf.js")).default;

      // Markdown → HTML
      let htmlContent = md.render(response);

      // Create a temporary container with proper styling
      const tempDiv = document.createElement("div");
      tempDiv.style.width = "800px";
      tempDiv.style.padding = "40px";
      tempDiv.style.fontFamily = "Arial, sans-serif";
      tempDiv.style.lineHeight = "1.6";
      tempDiv.innerHTML = htmlContent;

      // Process LaTeX math expressions if present
      const mathElements = tempDiv.querySelectorAll('script[type^="math/tex"]');
      mathElements.forEach((element: any) => {
        try {
          const tex = element.textContent || element.innerText;
          const displayMode = element.type.includes("display");
          const rendered = katex.renderToString(tex, {
            throwOnError: false,
            displayMode,
          });
          element.outerHTML = rendered;
        } catch (error) {
          console.warn("KaTeX rendering error:", error);
        }
      });

      // **IMPORTANT: Add BLACK COLOR to CSS**
      const style = document.createElement("style");
      style.textContent = `
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #000000 !important; /* Black color */
        }
        * { 
          color: #000000 !important; /* Force black for all elements */
        }
        h1, h2, h3 { 
          color: #000000 !important; 
          margin-top: 1em; 
          font-weight: bold;
        }
        h1 { font-size: 24px; }
        h2 { font-size: 20px; }
        h3 { font-size: 18px; }
        p, li, td, th, span, div { 
          color: #000000 !important; 
        }
        pre, code { 
          background: #f5f5f5; 
          padding: 8px; 
          border-radius: 4px; 
          color: #000000 !important;
        }
        table { 
          border-collapse: collapse; 
          width: 100%; 
        }
        th, td { 
          border: 1px solid #000000; 
          padding: 8px; 
          color: #000000 !important;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        blockquote { 
          border-left: 4px solid #ddd; 
          padding-left: 1em; 
          margin-left: 0; 
          color: #000000 !important;
        }
        a { 
          color: #0000EE !important; 
          text-decoration: underline;
        }
        strong, b {
          font-weight: bold !important;
          color: #000000 !important;
        }
      `;
      tempDiv.appendChild(style);

      // Convert to PDF
      const options = {
        margin: 20,
        filename: `LectureNotes_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor: "#FFFFFF", // White background
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
      };

      await (html2pdf as any)().from(tempDiv).set(options).save();

    } catch (error: any) {
      console.error("PDF generation failed:", error);
      alert(`Failed to generate PDF: ${error.message}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div style={{ 
      padding: "2rem", 
      fontFamily: "sans-serif", 
      maxWidth: "1200px", 
      margin: "0 auto",
      backgroundColor: "#ffffff",
      color: "#000000" // Black text for whole page
    }}>
      <h1 style={{ 
        marginBottom: "2rem", 
        color: "#000000", // Black color
        fontWeight: "bold"
      }}>
        Teacher Lecture Dashboard
      </h1>

      {/* Recording Section */}
      <div style={{ 
        marginBottom: "2rem", 
        padding: "1.5rem", 
        background: "#f8f9fa", 
        borderRadius: "8px",
        color: "#000000" // Black text
      }}>
        <h3 style={{ 
          marginBottom: "1rem", 
          color: "#000000" // Black color
        }}>
          Voice Recording
        </h3>
        <div>
          <button 
            onClick={startRecording}
            style={{
              padding: "10px 20px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px",
              fontWeight: "bold"
            }}
          >
            Start Recording
          </button>
          <button 
            onClick={stopRecording}
            style={{
              padding: "10px 20px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Stop Recording
          </button>
        </div>
      </div>

      {/* Transcript Section */}
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ 
          marginBottom: "1rem", 
          color: "#000000" // Black color
        }}>
          Live Transcript
        </h3>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Live transcript will appear here..."
          rows={8}
          style={{ 
            width: "100%", 
            padding: "1rem", 
            borderRadius: "4px",
            border: "1px solid #ddd",
            fontFamily: "monospace",
            resize: "vertical",
            backgroundColor: "#ffffff",
            color: "#000000" // Black text in textarea
          }}
        />
      </div>

      {/* File Upload Section */}
      <div style={{ 
        marginBottom: "2rem", 
        padding: "1.5rem", 
        background: "#f8f9fa", 
        borderRadius: "8px",
        color: "#000000" // Black text
      }}>
        <h3 style={{ 
          marginBottom: "1rem", 
          color: "#000000" // Black color
        }}>
          Upload Slides
        </h3>
        <input 
          type="file" 
          accept=".pdf,.ppt,.pptx" 
          onChange={handleFileChange}
          style={{
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            width: "100%",
            backgroundColor: "#ffffff",
            color: "#000000"
          }}
        />
        {file && (
          <p style={{ marginTop: "10px", color: "#000000" }}>
            Selected file: {file.name}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div style={{ marginBottom: "2rem" }}>
        <button 
          onClick={handleSubmit}
          style={{
            padding: "12px 24px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px",
            width: "100%",
            fontWeight: "bold"
          }}
        >
          Send to AI & Prepare Notes
        </button>
      </div>

      {/* Results Section */}
      {response && (
        <div style={{ 
          marginTop: "3rem", 
          borderTop: "2px solid #007bff", 
          paddingTop: "2rem",
          color: "#000000" // Black text
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "1.5rem" 
          }}>
            <h2 style={{ margin: 0, color: "#000000" }}>
              AI Generated Lecture Notes
            </h2>
            <button 
              onClick={downloadPDF}
              disabled={isGeneratingPDF}
              style={{
                padding: "10px 20px",
                background: isGeneratingPDF ? "#6c757d" : "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isGeneratingPDF ? "not-allowed" : "pointer",
                fontWeight: "bold"
              }}
            >
              {isGeneratingPDF ? "Generating PDF..." : "Download as PDF"}
            </button>
          </div>
          
          {/* Preview Section */}
          <div style={{ 
            background: "#f9f9f9", 
            padding: "2rem", 
            borderRadius: "8px",
            border: "1px solid #eaeaea",
            marginBottom: "2rem",
            color: "#000000" // Black text
          }}>
            <div
              id="notes-preview"
              style={{ color: "#000000" }} // Black text for preview
              dangerouslySetInnerHTML={{ __html: md.render(response) }}
            />
          </div>

          {/* Raw Markdown Section */}
          <details style={{ marginTop: "2rem", color: "#000000" }}>
            <summary style={{ 
              cursor: "pointer", 
              color: "#000000", // Black color
              fontSize: "14px",
              fontWeight: "bold"
            }}>
              View Raw Markdown
            </summary>
            <pre style={{ 
              background: "#f5f5f5", 
              padding: "1rem", 
              borderRadius: "4px",
              overflowX: "auto",
              marginTop: "10px",
              fontSize: "12px",
              color: "#000000" // Black text
            }}>
              {response}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}