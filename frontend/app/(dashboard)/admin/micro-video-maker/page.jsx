"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { reelJobAPI, videoAPI } from "@/lib/lmsService";
import { useAuth } from "@/context/AuthContext";

const initialForm = {
  title: "",
  topic: "",
  prompt: "",
  language: "English",
  tone: "Friendly",
  duration_seconds: 30,
  avatar_style: "Young Indian female tutor avatar",
  board_style: "Modern digital smart board",
  voice_style: "Warm teacher voice",
  call_to_action: "Follow Tutorlix for more quick explainers.",
  include_instagram_post: false,
  hashtags: "#Tutorlix, #StudyReels",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 14,
};

const panelStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
};

function toHashtagList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawTeacherAvatar(ctx) {
  ctx.save();
  ctx.translate(170, 1090);

  ctx.fillStyle = "#f5c7a9";
  ctx.beginPath();
  ctx.arc(0, -280, 84, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(0, -305, 88, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-88, -305, 176, 36);

  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-24, -284);
  ctx.quadraticCurveTo(0, -268, 24, -284);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(-115, -190);
  ctx.quadraticCurveTo(0, -255, 115, -190);
  ctx.lineTo(155, 120);
  ctx.lineTo(-155, 120);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f97316";
  ctx.fillRect(-28, -168, 56, 148);

  ctx.strokeStyle = "#f5c7a9";
  ctx.lineWidth = 24;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-102, -122);
  ctx.lineTo(-205, -16);
  ctx.moveTo(102, -122);
  ctx.lineTo(220, -78);
  ctx.moveTo(-68, 110);
  ctx.lineTo(-96, 258);
  ctx.moveTo(68, 110);
  ctx.lineTo(102, 258);
  ctx.stroke();

  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.arc(238, -92, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

async function createSceneImage(job, scene) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#fff7ed");
  gradient.addColorStop(0.55, "#f8fafc");
  gradient.addColorStop(1, "#e0f2fe");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.arc(120 + i * 110, 170 + (i % 2) * 90, 46 + (i % 3) * 14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 44px Georgia";
  ctx.fillText("Tutorlix Reel Draft", 72, 90);

  ctx.fillStyle = "#1e293b";
  ctx.font = "700 64px Georgia";
  const topicLines = wrapText(ctx, job.topic, 930);
  topicLines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, 72, 170 + index * 70);
  });

  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(350, 350, 640, 960, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(350, 350, 640, 76);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 38px sans-serif";
  ctx.fillText("Digital Smart Board", 392, 400);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 46px sans-serif";
  const boardLines = wrapText(ctx, scene.board_text, 540);
  boardLines.slice(0, 4).forEach((line, index) => {
    ctx.fillText(line, 396, 492 + index * 72);
  });

  ctx.font = "600 30px sans-serif";
  const voiceLines = wrapText(ctx, scene.voiceover, 540);
  voiceLines.slice(0, 5).forEach((line, index) => {
    ctx.fillText(line, 396, 860 + index * 46);
  });

  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(400, 1180);
  ctx.lineTo(920, 1180);
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.font = "600 26px sans-serif";
  const directionLines = wrapText(ctx, scene.visual_direction, 560);
  directionLines.slice(0, 4).forEach((line, index) => {
    ctx.fillText(line, 396, 1218 + index * 38);
  });

  drawTeacherAvatar(ctx);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.roundRect(72, 1450, 936, 330, 28);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px sans-serif";
  ctx.fillText(`Scene ${scene.order}`, 112, 1518);
  ctx.font = "500 30px sans-serif";
  const shotLines = wrapText(ctx, scene.shot, 840);
  shotLines.slice(0, 5).forEach((line, index) => {
    ctx.fillText(line, 112, 1580 + index * 42);
  });

  ctx.fillStyle = "#ea580c";
  ctx.font = "700 28px sans-serif";
  ctx.fillText(job.call_to_action || "Follow Tutorlix for more reels", 112, 1738);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export default function MicroVideoMakerPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || jobs[0] || null,
    [jobs, selectedJobId]
  );

  const loadJobs = async () => {
    setRefreshing(true);
    try {
      const data = await reelJobAPI.getAll();
      setJobs(data);
      setSelectedJobId((current) => current || data[0]?.id || null);
    } catch (error) {
      console.error("Failed to load reel jobs", error);
      setMessage({ type: "error", text: "Failed to load reel jobs." });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadJobs();
    }
  }, [user]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.topic.trim() || !form.prompt.trim()) {
      setMessage({ type: "error", text: "Topic and prompt are required." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        ...form,
        hashtags: toHashtagList(form.hashtags),
      };
      const created = await reelJobAPI.create(payload);
      setJobs((prev) => [created, ...prev]);
      setSelectedJobId(created.id);
      setMessage({ type: "success", text: "Reel draft generated." });
      setForm((prev) => ({
        ...initialForm,
        topic: prev.topic,
      }));
    } catch (error) {
      console.error("Failed to create reel draft", error);
      setMessage({
        type: "error",
        text: error.response?.data?.detail || "Failed to create reel draft.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerate = async (jobId) => {
    try {
      const updated = await reelJobAPI.regenerate(jobId);
      setJobs((prev) => prev.map((job) => (job.id === jobId ? updated : job)));
      setSelectedJobId(jobId);
      setMessage({ type: "success", text: "Reel draft regenerated." });
    } catch (error) {
      console.error("Failed to regenerate reel draft", error);
      setMessage({ type: "error", text: "Failed to regenerate reel draft." });
    }
  };

  const handleDownloadReel = async (job) => {
    if (!job?.scene_plan?.length) {
      setMessage({ type: "error", text: "No generated scenes available to render." });
      return;
    }

    setDownloading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append(
        "slides",
        JSON.stringify(
          job.scene_plan.map((scene) => ({
            title: `${job.topic} · Scene ${scene.order}`,
            subtitle: scene.voiceover,
            bg: "#ffffff",
          }))
        )
      );

      for (let index = 0; index < job.scene_plan.length; index += 1) {
        const scene = job.scene_plan[index];
        const blob = await createSceneImage(job, scene);
        formData.append(`image_${index}`, blob, `reel-scene-${index + 1}.png`);
      }

      const blob = await videoAPI.render(formData);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${job.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "tutorlix-reel"}.mp4`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Reel downloaded successfully." });
    } catch (error) {
      console.error("Failed to download reel", error);
      setMessage({ type: "error", text: "Failed to render reel video." });
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !user || user.role !== "admin") {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #fff7ed 0%, #f8fafc 28%, #eef2ff 100%)",
        padding: "28px 20px 56px",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
            Reel Maker
          </h1>
          <p style={{ color: "#475569", maxWidth: 900, lineHeight: 1.6 }}>
            Prompt-driven reel drafts for your admin team. This version generates a
            downloadable vertical MP4 with a teacher illustration, digital board scenes,
            caption-ready messaging, and no Instagram dependency.
          </p>
        </div>

        {message && (
          <div
            style={{
              ...panelStyle,
              marginBottom: 20,
              borderColor: message.type === "error" ? "#fecaca" : "#bbf7d0",
              background: message.type === "error" ? "#fef2f2" : "#f0fdf4",
              color: message.type === "error" ? "#991b1b" : "#166534",
            }}
          >
            {message.text}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <form onSubmit={handleCreate} style={panelStyle}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
              New Reel Draft
            </h2>

            <div style={{ display: "grid", gap: 12 }}>
              <input
                style={inputStyle}
                placeholder="Optional title"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Topic"
                value={form.topic}
                onChange={(e) => handleChange("topic", e.target.value)}
              />
              <textarea
                style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                placeholder="Prompt. Example: Explain binary search with one intuitive example and one interview mistake."
                value={form.prompt}
                onChange={(e) => handleChange("prompt", e.target.value)}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input
                  style={inputStyle}
                  placeholder="Language"
                  value={form.language}
                  onChange={(e) => handleChange("language", e.target.value)}
                />
                <input
                  style={inputStyle}
                  placeholder="Tone"
                  value={form.tone}
                  onChange={(e) => handleChange("tone", e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input
                  style={inputStyle}
                  type="number"
                  min="15"
                  max="120"
                  value={form.duration_seconds}
                  onChange={(e) => handleChange("duration_seconds", Number(e.target.value))}
                />
                <input
                  style={inputStyle}
                  placeholder="Voice style"
                  value={form.voice_style}
                  onChange={(e) => handleChange("voice_style", e.target.value)}
                />
              </div>

              <input
                style={inputStyle}
                placeholder="Avatar style"
                value={form.avatar_style}
                onChange={(e) => handleChange("avatar_style", e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Board style"
                value={form.board_style}
                onChange={(e) => handleChange("board_style", e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Call to action"
                value={form.call_to_action}
                onChange={(e) => handleChange("call_to_action", e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Hashtags separated by commas"
                value={form.hashtags}
                onChange={(e) => handleChange("hashtags", e.target.value)}
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#334155",
                  fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.include_instagram_post}
                  onChange={(e) => handleChange("include_instagram_post", e.target.checked)}
                />
                Keep Instagram caption metadata in the draft
              </label>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: "14px 16px",
                  fontWeight: 700,
                  background: submitting ? "#94a3b8" : "#0f172a",
                  color: "#fff",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Generating..." : "Generate Reel Draft"}
              </button>
            </div>
          </form>

          <div style={{ display: "grid", gap: 20 }}>
            <div style={panelStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Recent Reel Jobs</h2>
                <button
                  type="button"
                  onClick={loadJobs}
                  disabled={refreshing}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    background: "#fff",
                    padding: "10px 12px",
                    cursor: refreshing ? "not-allowed" : "pointer",
                  }}
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {jobs.length === 0 && (
                  <div style={{ color: "#64748b" }}>No reel jobs yet.</div>
                )}
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      padding: 14,
                      border:
                        selectedJob?.id === job.id
                          ? "1px solid #0f172a"
                          : "1px solid #e2e8f0",
                      background:
                        selectedJob?.id === job.id ? "#f8fafc" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{job.title}</div>
                    <div style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>
                      {job.topic}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <span style={{ fontSize: 12, color: "#1d4ed8" }}>{job.status}</span>
                      <span style={{ fontSize: 12, color: "#7c3aed" }}>{job.provider_status}</span>
                      <span style={{ fontSize: 12, color: "#047857" }}>
                        {job.include_instagram_post ? "caption ready" : "draft only"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedJob && (
              <div style={panelStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
                      {selectedJob.title}
                    </h2>
                    <div style={{ color: "#475569", lineHeight: 1.6 }}>
                      Topic: {selectedJob.topic}
                      <br />
                      Status: {selectedJob.status} | Provider: {selectedJob.provider_status}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleRegenerate(selectedJob.id)}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 10,
                        background: "#fff",
                        padding: "10px 12px",
                        cursor: "pointer",
                      }}
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadReel(selectedJob)}
                      disabled={downloading}
                      style={{
                        border: 0,
                        borderRadius: 10,
                        background: downloading ? "#94a3b8" : "#ea580c",
                        color: "#fff",
                        padding: "10px 12px",
                        cursor: downloading ? "not-allowed" : "pointer",
                      }}
                    >
                      {downloading ? "Rendering..." : "Download Reel"}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.8fr",
                    gap: 18,
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: 18 }}>
                    <section>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                        Generated Script
                      </h3>
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          padding: 14,
                          color: "#334155",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {selectedJob.script_text || "No script generated yet."}
                      </div>
                    </section>

                    <section>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                        Scene Plan
                      </h3>
                      <div style={{ display: "grid", gap: 10 }}>
                        {(selectedJob.scene_plan || []).map((scene) => (
                          <div
                            key={scene.order}
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: 12,
                              padding: 14,
                              background: "#fff",
                            }}
                          >
                            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                              Scene {scene.order} · {scene.duration_seconds}s
                            </div>
                            <div style={{ color: "#334155", lineHeight: 1.6 }}>
                              <strong>Shot:</strong> {scene.shot}
                              <br />
                              <strong>Board:</strong> {scene.board_text}
                              <br />
                              <strong>Voiceover:</strong> {scene.voiceover}
                              <br />
                              <strong>Direction:</strong> {scene.visual_direction}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div style={{ display: "grid", gap: 18 }}>
                    <section>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                        Instagram Draft
                      </h3>
                      <div
                        style={{
                          background: "#fff7ed",
                          border: "1px solid #fdba74",
                          borderRadius: 12,
                          padding: 14,
                          color: "#7c2d12",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.7,
                        }}
                      >
                        {selectedJob.instagram_caption}
                        {"\n\n"}
                        {(selectedJob.hashtags || []).join(" ")}
                      </div>
                    </section>

                    <section>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                        Board Notes
                      </h3>
                      <div style={{ ...panelStyle, padding: 14 }}>
                        <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", lineHeight: 1.8 }}>
                          {(selectedJob.board_notes || []).map((note, index) => (
                            <li key={`${note}-${index}`}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    </section>

                    <section>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                        Provider Payload
                      </h3>
                      <pre
                        style={{
                          margin: 0,
                          background: "#0f172a",
                          color: "#e2e8f0",
                          borderRadius: 12,
                          padding: 14,
                          overflowX: "auto",
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                      >
                        {JSON.stringify(selectedJob.provider_payload || {}, null, 2)}
                      </pre>
                    </section>

                    {selectedJob.error_message && (
                      <section
                        style={{
                          border: "1px solid #fecaca",
                          background: "#fef2f2",
                          color: "#991b1b",
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        {selectedJob.error_message}
                      </section>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
