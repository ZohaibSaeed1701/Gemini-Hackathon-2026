"use client";

import { useState } from "react";

interface Message {
  type: "user" | "bot";
  text: string;
}

export default function ChatBot() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file || !question) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("question", question);

    // Add user message to chat
    setChat((prev) => [...prev, { type: "user", text: question }]);
    setLoading(true);
    setQuestion("");

    try {
      const response = await fetch("http://127.0.0.1:8000/chat-with-notes", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      // Add bot answer to chat
      setChat((prev) => [...prev, { type: "bot", text: data.answer }]);
    } catch (err) {
      setChat((prev) => [...prev, { type: "bot", text: "Error fetching answer." }]);
    }

    setLoading(false);
  };

  return (
    <main style={{ maxWidth: "600px", margin: "40px auto" }}>
      <h2>Student RAG Chatbot</h2>

      <input
        type="file"
        accept=".txt,.pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          height: "300px",
          overflowY: "auto",
          marginTop: "20px",
        }}
      >
        {chat.map((msg, i) => (
          <div
            key={i}
            style={{
              textAlign: msg.type === "user" ? "right" : "left",
              margin: "8px 0",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "6px 12px",
                borderRadius: "10px",
                backgroundColor: msg.type === "user" ? "#DCF8C6" : "#EEE",
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      <textarea
        placeholder="Ask a question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        style={{ width: "100%", marginTop: "10px" }}
      />

      <button
        onClick={handleSubmit}
        disabled={loading || !file || !question}
        style={{ marginTop: "10px" }}
      >
        {loading ? "Thinking..." : "Send"}
      </button>
    </main>
  );
}
