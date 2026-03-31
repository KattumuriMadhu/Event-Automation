"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaExclamationTriangle } from "react-icons/fa";
import { API_BASE_URL } from "@/utils/config";
import { logoutUser } from "@/utils/auth";
import toast from "react-hot-toast";

export default function ServerError() {
    const router = useRouter();
    const [startTime] = useState(Date.now());
    const [isReconnecting, setIsReconnecting] = useState(false);

    useEffect(() => {
        let interval;

        const checkServer = async () => {
            try {
                // Ping a lightweight public endpoint
                // If the server is ALIVE, this returns a response object (even 404 or 401)
                // If it throws NetworkError, it means the server is DOWN.
                const res = await fetch(`${API_BASE_URL}/api/events/public`, {
                    method: 'GET',
                    headers: { 'Cache-Control': 'no-cache' }
                });

                if (res) {
                    clearInterval(interval);
                    recoverSession();
                }
            } catch (err) {
                // Network error (server still down), keep trying
                console.log("Server still unreachable, retrying auto-connection...");
            }
        };

        const recoverSession = () => {
             setIsReconnecting(true);
             const elapsedMs = Date.now() - startTime;
             const tenMinutesMs = 10 * 60 * 1000;

             if (elapsedMs <= tenMinutesMs) {
                 toast.success("Connection restored! Refreshing...", { duration: 4000 });
                 setTimeout(() => {
                     window.location.reload();
                 }, 1500);
             } else {
                 toast.error("Session expired due to extended downtime. Please login again.", { duration: 5000 });
                 logoutUser();
                 setTimeout(() => {
                     // Force full navigation to wipe memory state
                     window.location.href = "/login";
                 }, 2000);
             }
        };

        // Poll every 10 seconds
        interval = setInterval(checkServer, 10000);

        return () => clearInterval(interval);
    }, [startTime]);

    return (
        <div style={{
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '80vh', 
            textAlign: "center", 
            padding: "50px",
            fontFamily: 'inherit'
        }}>
            {/* INJECT CSS TO HIDE SHELL ELEMENTS */}
            <style jsx global>{`
                #global-chatbot-wrapper, 
                #global-header { 
                    display: none !important; 
                }
            `}</style>
            
            <FaExclamationTriangle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
                {isReconnecting ? "Server Connection Restored!" : "Service Unavailable"}
            </h2>
            <p style={{ marginTop: '10px', color: '#64748b', maxWidth: '400px', lineHeight: '1.5' }}>
                {isReconnecting 
                    ? "Getting you back to where you left off..." 
                    : "We're currently unable to connect to our servers. Please wait, we are actively trying to reconnect you in the background..."}
            </p>
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                    disabled={isReconnecting}
                    style={{
                        padding: '10px 20px',
                        background: isReconnecting ? '#cbd5e1' : '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isReconnecting ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        transition: 'background 0.2s'
                    }}
                    onClick={() => window.location.reload()}
                >
                    Retry Connection Manually
                </button>
            </div>
        </div>
    );
}
