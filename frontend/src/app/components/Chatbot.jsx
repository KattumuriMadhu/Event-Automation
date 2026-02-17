"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { usePathname } from "next/navigation";
import { getToken } from "@/utils/auth";

export default function Chatbot() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const [messages, setMessages] = useState([
        { role: "assistant", content: "Hi! How can I help you with the Event System today?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!pathname) return null;

    const isHidden =
        pathname.startsWith("/hod") ||
        pathname.startsWith("/admin/social-post") ||
        pathname === "/login" ||
        pathname.startsWith("/reset-password") ||
        pathname.startsWith("/create-password");

    if (isHidden) return null;

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setLoading(true);

        try {
            const token = getToken();
            const res = await fetch("http://localhost:5001/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message: userMsg }),
            });

            if (!res.ok) throw new Error("Failed to fetch");

            const data = await res.json();
            setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I'm having trouble connecting right now." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") handleSend();
    };

    const [isHovered, setIsHovered] = useState(false);

    return (
        <>
            {/* Floating Button with Pulse Effect */}
            <div
                style={{
                    position: "fixed",
                    bottom: "30px",
                    right: "30px",
                    zIndex: 9999,
                    display: isOpen ? "none" : "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px"
                }}
            >
                {/* Greeting Bubble */}
                <div style={{
                    background: "white",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                    marginBottom: "8px",
                    opacity: isHovered && !isOpen ? 1 : 0,
                    transform: isHovered && !isOpen ? "translateY(0) scale(1)" : "translateY(10px) scale(0.8)",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    transition: "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)", // Cute bounce effect
                    borderBottomRightRadius: "4px"
                }}>
                    👋 Hi! I'm Jarvis
                </div>

                <button
                    onClick={() => setIsOpen(true)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        background: "white",
                        border: "none",
                        boxShadow: isHovered
                            ? "0 8px 25px rgba(37, 99, 235, 0.5)"
                            : "0 4px 15px rgba(0,0,0,0.15)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        transform: isHovered ? "scale(1.1) translateY(-5px)" : "scale(1)",
                        padding: 0,
                        overflow: "hidden"
                    }}
                >
                    <img
                        src="/generated-image.png"
                        alt="Chat Assistant"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                </button>
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        bottom: "30px",
                        right: "30px",
                        width: "380px",
                        maxWidth: "90vw",
                        height: "600px",
                        maxHeight: "80vh",
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        borderRadius: "24px",
                        boxShadow: "0 20px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.2)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        zIndex: 9999,
                        animation: "slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                >
                    {/* Global Styles */}
                    <style jsx global>{`
                        @keyframes slideIn {
                            from { opacity: 0; transform: translateY(40px) scale(0.95); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        @keyframes float {
                            0% { transform: translateY(0px); }
                            50% { transform: translateY(-5px); }
                            100% { transform: translateY(0px); }
                        }
                        @keyframes blink {
                            0% { opacity: 0.2; }
                            50% { opacity: 1; }
                            100% { opacity: 0.2; }
                        }
                    `}</style>

                    {/* Header */}
                    <div style={{
                        padding: "20px 24px",
                        background: "rgba(37, 99, 235, 0.9)", // slightly stronger blue base
                        backdropFilter: "blur(10px)",
                        color: "white",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        boxShadow: "0 4px 20px rgba(37,99,235,0.15)",
                        borderBottom: "1px solid rgba(255,255,255,0.1)"
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                background: 'white',
                                borderRadius: '50%',
                                padding: '2px',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
                            }}>
                                <img src="/generated-image.png" alt="Jarvis" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.01em', textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>Jarvis AI</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: 0.95, fontWeight: "500" }}>
                                    <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 8px #4ade80' }}></span>
                                    Online
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                backdropFilter: "blur(4px)"
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.25)';
                                e.target.style.transform = 'rotate(90deg)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.15)';
                                e.target.style.transform = 'rotate(0deg)';
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "24px",
                        background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "20px",
                    }}>
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                style={{
                                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                                    maxWidth: "85%",
                                    padding: "16px 20px",
                                    borderRadius: "20px",
                                    fontSize: "15px",
                                    fontWeight: "400",
                                    lineHeight: "1.6",
                                    background: msg.role === "user"
                                        ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                                        : "white",
                                    color: msg.role === "user" ? "#ffffff" : "#334155",
                                    boxShadow: msg.role === "user"
                                        ? "0 10px 20px -5px rgba(37,99,235,0.4)"
                                        : "0 4px 15px -3px rgba(0,0,0,0.05)",
                                    borderBottomRightRadius: msg.role === "user" ? "4px" : "20px",
                                    borderBottomLeftRadius: msg.role === "assistant" ? "4px" : "20px",
                                    border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.5)" : "none"
                                }}
                            >
                                {msg.content}
                            </div>
                        ))}
                        {loading && (
                            <div style={{
                                alignSelf: 'flex-start',
                                padding: '14px 24px',
                                background: 'white',
                                borderRadius: '20px',
                                fontSize: '14px',
                                color: '#64748b',
                                display: 'flex',
                                gap: '4px',
                                alignItems: 'center',
                                boxShadow: "0 4px 15px -3px rgba(0,0,0,0.05)",
                                borderBottomLeftRadius: "4px"
                            }}>
                                <span style={{ fontWeight: "500" }}>Jarvis is thinking</span>
                                <span style={{ animation: 'blink 1s 0s infinite' }}>.</span>
                                <span style={{ animation: 'blink 1s 0.2s infinite' }}>.</span>
                                <span style={{ animation: 'blink 1s 0.4s infinite' }}>.</span>
                                {/* Styles moved to global block */}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{
                        padding: "20px",
                        background: "white",
                        borderTop: "1px solid rgba(0,0,0,0.03)",
                        display: "flex",
                        alignItems: 'center',
                        gap: "12px",
                    }}>
                        <input
                            style={{
                                flex: 1,
                                border: "2px solid #f1f5f9",
                                borderRadius: "30px",
                                padding: "14px 24px",
                                fontSize: "15px",
                                outline: "none",
                                transition: "all 0.3s ease",
                                color: '#334155',
                                background: '#f8fafc',
                                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.01)"
                            }}
                            placeholder="Ask Jarvis anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#3b82f6';
                                e.target.style.background = '#fff';
                                e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#f1f5f9';
                                e.target.style.background = '#f8fafc';
                                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.01)';
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            style={{
                                width: "52px",
                                height: "52px",
                                borderRadius: "50%",
                                background: input.trim()
                                    ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                                    : "#f1f5f9",
                                color: input.trim() ? "white" : "#cbd5e1",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: input.trim() ? "pointer" : "default",
                                transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                transform: input.trim() ? "scale(1)" : "scale(0.95)",
                                boxShadow: input.trim() ? "0 8px 20px rgba(37, 99, 235, 0.3)" : "none"
                            }}
                        >
                            <Send size={22} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
