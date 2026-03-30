import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Minimize2, Bot, User, Sparkles } from "lucide-react";
import axios from "axios";
import API_BASE from "../config/api.js";

const AIChatbot = ({ isOpen, onClose, minimized, onMinimize }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content: "Hello! I'm your HR Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "How many leave days do I have?",
    "What are the company holidays?",
    "How do I check my attendance?",
    "What's the work timing?",
  ]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (messageText = null) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE}/api/ai/chat`,
        { message: text },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const botMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: response.data.response.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);

        if (response.data.response.suggestions) {
          setSuggestions(response.data.response.suggestions);
        }
      }
    } catch {
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        minimized ? "w-16 h-16" : "w-96 h-[500px]"
      }`}
      style={{
        backgroundColor: "var(--card-bg)",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        style={{
          backgroundColor: "var(--primary-color)",
          color: "white",
        }}
        onClick={minimized ? onMinimize : undefined}
      >
        <div className="flex items-center gap-2">
          <Bot size={20} />
          {!minimized && (
            <span className="font-semibold flex items-center gap-2">
              <Sparkles size={16} />
              HR Assistant
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!minimized && (
            <button
              onClick={onMinimize}
              className="p-1 hover:bg-white/20 rounded"
              title="Minimize"
            >
              <Minimize2 size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: "380px" }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex gap-2 max-w-[85%] ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-blue-600"
                        : "bg-gradient-to-r from-purple-600 to-blue-600"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User size={14} color="white" />
                    ) : (
                      <Bot size={14} color="white" />
                    )}
                  </div>
                  <div
                    className={`p-2 rounded-lg text-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-100"
                    }`}
                    style={{
                      backgroundColor:
                        msg.role === "user"
                          ? "var(--primary-color)"
                          : "var(--input-bg)",
                      color: msg.role === "user" ? "white" : "var(--text-primary)",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(to right, #9333ea, #2563eb)" }}
                  >
                    <Bot size={14} color="white" />
                  </div>
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: "var(--input-bg)" }}
                  >
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {suggestions.length > 0 && messages.length <= 2 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion)}
                  className="text-xs px-2 py-1 rounded-full transition-colors"
                  style={{
                    backgroundColor: "var(--primary-color)",
                    color: "white",
                    opacity: 0.8,
                  }}
                  onMouseOver={(e) => (e.target.style.opacity = 1)}
                  onMouseOut={(e) => (e.target.style.opacity = 0.8)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "var(--primary-color)",
                  color: "white",
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIChatbot;
