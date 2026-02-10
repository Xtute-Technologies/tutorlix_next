import { createReactBlockSpec } from "@blocknote/react";
import { Youtube, MonitorPlay } from "lucide-react";
import { defaultProps } from "@blocknote/core";

const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const YoutubeBlock = ({ block, editor }) => {
  const { url, width } = block.props;
  const videoId = getYoutubeId(url);

  const updateUrl = (val) => {
    const id = getYoutubeId(val);
    if (id || val === "") {
      editor.updateBlock(block, { props: { ...block.props, url: val } });
    }
  };

  const setWidth = (w) => {
    editor.updateBlock(block, { props: { ...block.props, width: w } });
  };

  if (!videoId && !editor.isEditable) return null;

  return (
    <div className="flex flex-col items-center my-6 w-full" data-youtube-block="true">
      {!videoId ? (
        <div className="w-full p-8 bg-muted/20 rounded-xl border-2 border-dashed flex flex-col items-center gap-4" contentEditable={false}>
          <div className="flex items-center gap-2 text-red-600 font-semibold">
            <Youtube size={24} />
            <span>YouTube Embed</span>
          </div>
          <input
            type="text"
            placeholder="Paste link and press Enter..."
            className="w-full max-w-md p-2.5 rounded-md border shadow-sm bg-background text-sm"
            onKeyDown={(e) => e.key === "Enter" && updateUrl(e.target.value)}
            autoFocus
          />
        </div>
      ) : (
        <div className="flex flex-col items-center w-full gap-3" contentEditable={false}>
          {editor.isEditable && (
            <div className="flex items-center justify-between w-full max-w-2xl bg-muted/50 p-2 rounded-lg border border-border/50">
              <div className="flex gap-1.5">
                {["50%", "75%", "100%"].map((w) => (
                  <button
                    key={w}
                    onClick={() => setWidth(w)}
                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                      width === w ? "bg-primary text-primary-foreground shadow-sm" : "bg-background hover:bg-muted border"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <button
                onClick={() => updateUrl("")}
                className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10 rounded-md"
              >
                <MonitorPlay size={14} />
                CHANGE VIDEO
              </button>
            </div>
          )}

          <div
            className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-border"
            style={{ width: width || "100%", aspectRatio: "16 / 9" }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube Video"
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
            />
            {editor.isEditable && (
              <div className="absolute inset-0 z-10 pointer-events-auto bg-transparent" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const YoutubeBlockSpec = createReactBlockSpec(
  {
    type: "youtube",
    propSchema: {
      ...defaultProps,
      url: { default: "" },
      width: { default: "100%", values: ["50%", "75%", "100%"] },
    },
    content: "none",
  },
  {
    render: YoutubeBlock,
    // FIX: Disables reordering/dragging and selection to prevent the "found: [object HTMLDivElement]" error
    meta: {
      selectable: false,
    },
    parse: (element) => {
      if (element.hasAttribute("data-youtube-block")) {
        return {
          url: element.getAttribute("data-url"),
          width: element.getAttribute("data-width"),
        };
      }
    },
    // FIX: Changed from raw DOM manipulation to JSX for React compatibility
    toExternalHTML: ({ block }) => {
      const id = getYoutubeId(block.props.url);
      if (!id) return <div />;

      return (
        <div 
          data-youtube-block="true" 
          data-url={block.props.url} 
          data-width={block.props.width}
          style={{
            padding: "20px",
            margin: "10px 0",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            backgroundColor: "#f8fafc",
            textAlign: "center"
          }}
        >
          <div style={{ color: "#ef4444", fontWeight: "bold", marginBottom: "8px" }}>📺 VIDEO CONTENT</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
            A YouTube video was embedded here:
          </div>
          <a href={block.props.url} style={{ fontSize: "12px", color: "#3b82f6", textDecoration: "underline" }}>
            {block.props.url}
          </a>
        </div>
      );
    },
  }
);