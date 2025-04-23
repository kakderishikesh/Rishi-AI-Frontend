import { useRef, useState, useEffect } from "react";
import { Send, AlertCircle, RotateCw, ChevronDown } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { v4 as uuid } from "uuid";

const STARTER_PROMPTS = [
  "Tell me about your background",
  "What are your technical skills?",
  "What projects have you worked on?",
  "What is your educational qualifications?",
];

const AVATAR_URL = "/lovable-uploads/9e54211b-4aa8-4122-aa1d-5ccdc40b6e5c.png";

const initialMessages = [
  {
    id: uuid(),
    sender: "ai",
    text: "Hi 👋 I'm Rishi-AI! Ask me about my experience, skills, or interests.",
  },
];

export default function RishiAIChat() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputRows, setInputRows] = useState(1);
  const [streamedText, setStreamedText] = useState("");
  const [showStarterPrompts, setShowStarterPrompts] = useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (isScrolledToBottom) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, streamedText]);

  const handleScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 60;
    setIsScrolledToBottom(atBottom);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    if (textareaRef.current) {
      textareaRef.current.rows = 1;
      const lineHeight = 24;
      const rows = Math.floor(textareaRef.current.scrollHeight / lineHeight);
      setInputRows(Math.min(rows, 6));
      textareaRef.current.rows = Math.min(rows, 6);
    }
  };

  async function fetchAssistantResponse({
    userMessages,
    onStreamChunk,
  }: {
    userMessages: { id: string; sender: string; text: string }[];
    onStreamChunk: (callback: (prev: string) => string) => void;
  }) {
    const mappedMessages = userMessages.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
    }));

    const resp = await fetch(
      import.meta.env.DEV ? "http://localhost:9999/api/openai" : "/api/openai",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: mappedMessages }),
      }
    );

    if (!resp.ok || !resp.body) throw new Error("Backend API error");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);

        if (chunk.startsWith("data:")) {
          const text = chunk.replace("data:", "").trim();
          if (text === "[DONE]") break;
          onStreamChunk((prev) => prev + text);
        }

        boundary = buffer.indexOf("\n\n");
      }
    }
  }

  const sendToAssistant = async (newUserMsg: any, history: any) => {
    setStreamedText("");
    try {
      await fetchAssistantResponse({
        userMessages: [...history, newUserMsg],
        onStreamChunk: setStreamedText,
      });

      setMessages((msgs) => [
        ...msgs,
        { id: uuid(), sender: "ai", text: streamedText || "(No response)" },
      ]);
    } catch {
      setMessages((msgs) => [
        ...msgs,
        { id: uuid(), sender: "error", text: "Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
      setStreamedText("");
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const userMsg = { id: uuid(), sender: "user", text: input.trim() };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setInputRows(1);
    setLoading(true);
    setShowStarterPrompts(false);
    sendToAssistant(userMsg, messages);
  };

  const handlePromptClick = (text: string) => {
    if (loading) return;
    const userMsg = { id: uuid(), sender: "user", text };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setInputRows(1);
    setLoading(true);
    setShowStarterPrompts(false);
    sendToAssistant(userMsg, messages);
  };

  const retryLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find((msg) => msg.sender === "user");
    if (!lastUserMsg) return;
    setLoading(true);
    setMessages((msgs) => msgs.filter((msg) => msg.sender !== "error"));
    sendToAssistant(lastUserMsg, messages.filter((msg) => msg.sender !== "error"));
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex flex-col items-center justify-center py-4 shadow-sm">
        <img src={AVATAR_URL} alt="Rishi avatar" className="w-24 h-24 rounded-full border-4 border-primary shadow object-cover" />
        <h1 className="text-2xl font-bold mt-3 text-black">How can I help you today?</h1>
      </header>

      {/* Chat Body */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pt-4 pb-1 max-w-3xl w-full mx-auto scrollbar-thin scrollbar-thumb-gray-300"
      >
        {showStarterPrompts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePromptClick(prompt)}
                className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-300 shadow text-black transition-all"
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                {msg.sender === "ai" && <img src={AVATAR_URL} alt="AI" className="w-8 h-8 rounded-full border border-gray-300 mr-3" />}
                <div className={`max-w-[75%] px-4 py-3 rounded-xl text-base break-words
                  ${msg.sender === "ai" ? "bg-gray-100 text-black border border-gray-300 rounded-bl-none"
                    : msg.sender === "user" ? "bg-black text-white border border-black rounded-br-none"
                    : "bg-red-100 text-red-700 border border-red-400 rounded-md"}`}>
                  {msg.sender === "error" ? (
                    <div className="flex items-center justify-between">
                      <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                      <span className="flex-1">{msg.text}</span>
                      <button onClick={retryLastMessage} title="Retry" className="ml-3 text-sm text-red-600 hover:text-red-800">
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>
                  ) : msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex mb-4 items-end justify-start animate-fade-in">
                <img src={AVATAR_URL} alt="AI" className="w-8 h-8 rounded-full border border-gray-300 mr-3" />
                <div className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-100 text-black rounded-bl-none">
                  {streamedText || <span className="animate-pulse">...</span>}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </>
        )}

        {!isScrolledToBottom && (
          <button
            className="fixed bottom-28 right-4 z-50 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800"
            onClick={scrollToBottom}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Footer */}
      <footer className="py-4 px-4 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto flex flex-row items-end gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={inputRows}
            className="flex-1 p-3 text-black bg-transparent resize-none placeholder:text-gray-600 text-base max-h-40 min-h-[48px]"
            placeholder="Ask me anything about Rishi…"
            disabled={loading}
          />
          <button
            className="p-3 rounded-xl bg-black hover:bg-gray-800 text-white flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Send"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}