"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import loadingAnimation from "../lottie/loading.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function Loader({ solid = false }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: solid ? 'white' : 'transparent',
            // backdropFilter: 'blur(5px)', // Removed blur as requested to "remove layer"
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2147483647, // Max z-index to cover everything including header
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '24px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2), 0 0 100px rgba(0,0,0,0.1)', // enhanced shadow for visibility without overlay
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '15px'
            }}>
                <div style={{ width: '120px', height: '120px' }}>
                    <Lottie animationData={loadingAnimation} loop={true} />
                </div>
                <p style={{
                    margin: 0,
                    color: '#64748b',
                    fontSize: '16px',
                    fontWeight: '500',
                    letterSpacing: '0.5px'
                }}>Loading...</p>
            </div>
            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
        </div>
    );
}
