"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { videoAPI } from "@/lib/lmsService";

export default function MicroVideoMakerPage() {
    const { user } = useAuth();
    if (!user || user.role !== "admin") return null;

    const [slides, setSlides] = useState([
        { title: "", subtitle: "", bg: "#020617", image: null, audio: null },
    ]);
    const [processing, setProcessing] = useState(false);

    /* =========================
       SLIDE HELPERS
       ========================= */
    const updateSlide = (i, key, value) => {
        const copy = [...slides];
        copy[i][key] = value;
        setSlides(copy);
    };

    const addSlide = () => {
        setSlides([
            ...slides,
            { title: "", subtitle: "", bg: "#020617", image: null, audio: null },
        ]);
    };

    const removeSlide = (i) => {
        if (slides.length === 1) return;
        setSlides(slides.filter((_, idx) => idx !== i));
    };

    /* =========================
       TEXT WRAPPING UTILITY
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
       RENDER SLIDE → IMAGE
       ========================= */
    const renderSlideImage = async (slide) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext("2d");

        // Background color
        ctx.fillStyle = slide.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image
        const img = new Image();
        img.src = URL.createObjectURL(slide.image);
        await new Promise((res) => (img.onload = res));

        ctx.drawImage(img, 0, 0, 1080, 1920);

        const centerX = 540;
        const maxWidth = 900;

        /* ===== TITLE ===== */
        ctx.font = "bold 72px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";

        const titleLines = wrapText(ctx, slide.title, maxWidth);
        let y = 670;

        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, y - 40, 1080, titleLines.length * 90 + 40);

        ctx.fillStyle = "#fff";
        titleLines.forEach((line, i) => {
            ctx.fillText(line, centerX, y + i * 90);
        });

        /* ===== SUBTITLE ===== */
        ctx.font = "42px sans-serif";
        const subtitleLines = wrapText(ctx, slide.subtitle, maxWidth);
        y += titleLines.length * 90 + 80;

        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, y - 30, 1080, subtitleLines.length * 60 + 40);

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
                JSON.stringify(slides.map(({ title, subtitle, bg }) => ({
                    title,
                    subtitle,
                    bg,
                })))
            );

            for (let i = 0; i < slides.length; i++) {
                const renderedImage = await renderSlideImage(slides[i]);
                formData.append(`image_${i}`, renderedImage, `slide_${i}.png`);

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

    return (
        <div style={{ padding: 40, maxWidth: 1100, margin: "auto" }}>
            <h1 style={{ fontSize: 28, fontWeight: "bold" }}>
                Canva-Style Micro Video Maker
            </h1>

            {slides.map((slide, i) => (
                <div
                    key={i}
                    style={{
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 20,
                    }}
                >
                    <h3>Slide {i + 1}</h3>

                    <input
                        placeholder="Title"
                        value={slide.title}
                        onChange={(e) => updateSlide(i, "title", e.target.value)}
                        style={{ width: "100%", marginBottom: 8 }}
                    />

                    <textarea
                        placeholder="Subtitle"
                        value={slide.subtitle}
                        onChange={(e) =>
                            updateSlide(i, "subtitle", e.target.value)
                        }
                        style={{ width: "100%", marginBottom: 8 }}
                    />

                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            updateSlide(i, "image", e.target.files[0])
                        }
                    />

                    <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) =>
                            updateSlide(i, "audio", e.target.files[0])
                        }
                        style={{ display: "block", marginTop: 8 }}
                    />

                    <input
                        type="color"
                        value={slide.bg}
                        onChange={(e) => updateSlide(i, "bg", e.target.value)}
                        style={{ marginTop: 8 }}
                    />

                    <button
                        onClick={() => removeSlide(i)}
                        style={{ marginTop: 10, color: "red" }}
                    >
                        Remove Slide
                    </button>
                </div>
            ))}

            <button onClick={addSlide}>➕ Add Slide</button>

            <button
                onClick={generateVideo}
                disabled={processing}
                style={{
                    marginLeft: 10,
                    padding: 12,
                    background: processing ? "#999" : "#000",
                    color: "#fff",
                }}
            >
                {processing ? "Rendering…" : "Generate Video"}
            </button>
        </div>
    );
}
