"use client";

import { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { API_BASE_URL } from "@/utils/config";

export default function ImageSlider({ images, title, showControls = true }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) {
        return <div className="placeholder-cover" style={{ width: '100%', height: '100%', background: '#eee' }} />;
    }

    // Preload images to prevent flickering/loading delays
    useEffect(() => {
        images.forEach((src) => {
            const img = new Image();
            img.src = src.startsWith("http") ? src : `${API_BASE_URL}${src}`;
        });
    }, [images]);

    const nextSlide = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const currentImage = images[currentIndex];
    const imageUrl = currentImage.startsWith("http") ? currentImage : `${API_BASE_URL}${currentImage}`;

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
            <img
                src={imageUrl}
                alt={`${title} - Image ${currentIndex + 1}`}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "opacity 0.3s ease-in-out"
                }}
            />

            {showControls && images.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "10px",
                            transform: "translateY(-50%)",
                            background: "rgba(0,0,0,0.5)",
                            color: "white",
                            border: "none",
                            borderRadius: "50%",
                            width: "30px",
                            height: "30px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 2
                        }}
                    >
                        <FaChevronLeft size={14} />
                    </button>

                    <button
                        onClick={nextSlide}
                        style={{
                            position: "absolute",
                            top: "50%",
                            right: "10px",
                            transform: "translateY(-50%)",
                            background: "rgba(0,0,0,0.5)",
                            color: "white",
                            border: "none",
                            borderRadius: "50%",
                            width: "30px",
                            height: "30px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 2
                        }}
                    >
                        <FaChevronRight size={14} />
                    </button>

                    <div style={{
                        position: "absolute",
                        bottom: "10px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        gap: "5px",
                        zIndex: 2
                    }}>
                        {images.map((_, idx) => (
                            <div
                                key={idx}
                                style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    background: idx === currentIndex ? "white" : "rgba(255,255,255,0.5)",
                                    cursor: "pointer"
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentIndex(idx);
                                }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
