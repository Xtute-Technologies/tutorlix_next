"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { videoAPI } from "@/lib/lmsService";

export default function MicroVideoMakerPage() {
    const { user } = useAuth();
    if (!user || user.role !== "admin") return null;

    const [slides, setSlides] = useState([
        { title: "", subtitle: "", bg: "#020617", image: null, audio: null },
    ]);
    const [processing, setProcessing] = useState(false);

    const slidesEndRef = useRef(null);

    /* =========================
       FILE UPLOAD BUTTON
       ========================= */
    const FileUploadButton = ({ label, accept, value, onChange }) => {
        const inputRef = useRef(null);

        return (
            <div>
                <button
                    type="button"
                    onClick={() => inputRef.current.click()}
                    style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "2px solid #d1d5db",
                        background: "#f9fafb",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 14,
                    }}
                >
                    {value ? `📎 ${value.name}` : `⬆️ ${label}`}
                </button>

                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    onChange={onChange}
                    style={{ display: "none" }}
                />
            </div>
        );
    };

    /* =========================
       SLIDE HELPERS
       ========================= */
    const updateSlide = (i, key, value) => {
        const copy = [...slides];
        copy[i][key] = value;
        setSlides(copy);
    };

    const addSlide = () => {
        setSlides((prev) => [
            ...prev,
            { title: "", subtitle: "", bg: "#020617", image: null, audio: null },
        ]);

        setTimeout(() => {
            slidesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const removeSlide = (i) => {
        if (slides.length === 1) return;
        setSlides(slides.filter((_, idx) => idx !== i));
    };

    /* =========================
       TEXT WRAP
       ========================= */
    const wrapText = (ctx, text, maxWidth) => {
        const words = text.split(" ");
        const lines = [];
        let line = "";

        words.forEach((word) => {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width <= maxWidth) {
                line = test;
            } else {
                lines.push(line);
                line = word;
            }
        });

        if (line) lines.push(line);
        return lines;
    };

    /* =========================
       CANVAS RENDER
       ========================= */
    const renderSlideImage = async (slide) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = slide.bg;
        ctx.fillRect(0, 0, 1080, 1920);

        const img = new Image();
        img.src = URL.createObjectURL(slide.image);
        await new Promise((res) => (img.onload = res));
        ctx.drawImage(img, 0, 0, 1080, 1920);

        const centerX = 540;
        const maxWidth = 900;

        ctx.font = "bold 72px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const titleLines = wrapText(ctx, slide.title, maxWidth);
        const lineHeight = 90;
        const totalHeight = titleLines.length * lineHeight;
        let y = canvas.height / 2 - totalHeight / 2 - 100;

        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, y - 30, 1080, totalHeight + 40);

        ctx.fillStyle = "#fff";
        titleLines.forEach((line, i) => {
            ctx.fillText(line, centerX, y + i * lineHeight);
        });

        ctx.font = "42px sans-serif";
        const subtitleLines = wrapText(ctx, slide.subtitle, maxWidth);
        y += totalHeight + 60;

        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, y - 25, 1080, subtitleLines.length * 60 + 35);

        ctx.fillStyle = "#fff";
        subtitleLines.forEach((line, i) => {
            ctx.fillText(line, centerX, y + i * 60);
        });

        return new Promise((resolve) =>
            canvas.toBlob((blob) => resolve(blob), "image/png")
        );
    };

    /* =========================
       GENERATE VIDEO
       ========================= */
    const generateVideo = async () => {
        if (slides.some((s) => !s.title || !s.subtitle || !s.image)) {
            alert("Each slide needs title, subtitle & image");
            return;
        }

        setProcessing(true);

        try {
            const formData = new FormData();

            formData.append(
                "slides",
                JSON.stringify(
                    slides.map(({ title, subtitle, bg }) => ({
                        title,
                        subtitle,
                        bg,
                    }))
                )
            );

            for (let i = 0; i < slides.length; i++) {
                const rendered = await renderSlideImage(slides[i]);
                formData.append(`image_${i}`, rendered, `slide_${i}.png`);

                if (slides[i].audio) {
                    formData.append(`audio_${i}`, slides[i].audio);
                }
            }

            const blob = await videoAPI.render(formData);
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "tutorlix-micro-video.mp4";
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Failed to generate video");
        } finally {
            setProcessing(false);
        }
    };

    const inputStyle = {
        width: "100%",
        padding: 10,
        marginBottom: 10,
        borderRadius: 6,
        border: "2px solid #d1d5db",
    };

    return (
        <div style={{ maxWidth: 1100, margin: "40px auto", padding: "0 20px" }}>
            <h1 style={{ fontSize: 32, fontWeight: 700 }}>
                🎬 Micro Video Maker
            </h1>

            {slides.map((slide, i) => (
                <div
                    key={i}
                    style={{
                        background: "#fff",
                        borderRadius: 12,
                        padding: 20,
                        marginBottom: 24,
                        boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
                        position: "relative",
                    }}
                >
                    {/* REMOVE SLIDE */}
                    {slides.length > 1 && (
                        <button
                            onClick={() => removeSlide(i)}
                            style={{
                                position: "absolute",
                                top: 14,
                                right: 14,
                                border: "none",
                                background: "#fee2e2",
                                color: "#b91c1c",
                                padding: "6px 10px",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontWeight: 600,
                            }}
                        >
                            ✕ Remove
                        </button>
                    )}

                    <h3>Slide {i + 1}</h3>

                    <input
                        placeholder="Title"
                        value={slide.title}
                        onChange={(e) =>
                            updateSlide(i, "title", e.target.value)
                        }
                        style={inputStyle}
                    />

                    <textarea
                        placeholder="Subtitle"
                        value={slide.subtitle}
                        rows={3}
                        onChange={(e) =>
                            updateSlide(i, "subtitle", e.target.value)
                        }
                        style={inputStyle}
                    />

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 16,
                        }}
                    >
                        <FileUploadButton
                            label="Upload Background Image *"
                            accept="image/*"
                            value={slide.image}
                            onChange={(e) =>
                                updateSlide(i, "image", e.target.files[0])
                            }
                        />

                        <FileUploadButton
                            label="Upload Background Music (optional)"
                            accept="audio/*"
                            value={slide.audio}
                            onChange={(e) =>
                                updateSlide(i, "audio", e.target.files[0])
                            }
                        />
                    </div>

                    <input
                        type="color"
                        value={slide.bg}
                        onChange={(e) =>
                            updateSlide(i, "bg", e.target.value)
                        }
                        style={{ marginTop: 12 }}
                    />
                </div>
            ))}

            <div ref={slidesEndRef} />

            {/* FIXED BOTTOM BAR */}
            <div
                style={{
                    position: "sticky",
                    bottom: 0,
                    background: "#fff",
                    borderTop: "1px solid #e5e7eb",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
                }}
            >
                <button
                    onClick={addSlide}
                    style={{
                        padding: "12px 18px",
                        borderRadius: 8,
                        border: "2px dashed #9ca3af",
                        background: "#f9fafb",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    ➕ Add Slide
                </button>

                <button
                    onClick={generateVideo}
                    disabled={processing}
                    style={{
                        padding: "12px 28px",
                        borderRadius: 8,
                        border: "none",
                        background: processing ? "#9ca3af" : "#111827",
                        color: "#fff",
                        fontWeight: 700,
                    }}
                >
                    {processing ? "Rendering…" : "Generate Video"}
                </button>
            </div>
        </div>
    );
}
