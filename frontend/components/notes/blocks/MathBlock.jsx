import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useRef, useState } from "react";

const SYMBOL_GROUPS = [
  {
    label: "Algebra",
    symbols: ["±", "×", "÷", "·", "≠", "≈", "≡", "≤", "≥", "∝", "∞", "√", "∛", "∜", "|x|", "‰"],
  },
  {
    label: "Powers",
    symbols: ["²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "⁰", "ⁿ", "₀", "₁", "₂", "₃", "₄", "₅"],
  },
  {
    label: "Greek",
    symbols: ["α", "β", "γ", "δ", "ε", "θ", "λ", "μ", "π", "ρ", "σ", "τ", "φ", "ψ", "ω", "Γ", "Δ", "Θ", "Π", "Σ", "Ω"],
  },
  {
    label: "Sets",
    symbols: ["∈", "∉", "∋", "∅", "ℕ", "ℤ", "ℚ", "ℝ", "ℂ", "⊂", "⊆", "⊃", "⊇", "∪", "∩", "∖"],
  },
  {
    label: "Logic",
    symbols: ["∀", "∃", "∄", "∧", "∨", "¬", "⇒", "⇔", "∴", "∵", "⊢", "⊨"],
  },
  {
    label: "Calculus",
    symbols: ["∑", "∏", "∫", "∬", "∭", "∮", "∂", "∇", "lim", "d/dx", "dy/dx", "f′(x)", "dx"],
  },
  {
    label: "Geometry",
    symbols: ["∠", "∟", "⊥", "∥", "≅", "∼", "△", "○", "°", "sin", "cos", "tan", "sec", "cosec", "cot"],
  },
  {
    label: "Stats",
    symbols: ["P(A)", "E(X)", "Var(X)", "σ²", "μ", "x̄", "nCr", "nPr", "N(μ, σ²)", "∼"],
  },
];

const STARTER_BODY = `Concept:

Formula:

Question:

Solution steps:`;

const MathBlock = ({ block, editor }) => {
  const textareaRef = useRef(null);
  const [titleValue, setTitleValue] = useState(block.props.title || "");
  const [bodyValue, setBodyValue] = useState(block.props.body || "");

  useEffect(() => {
    setTitleValue(block.props.title || "");
    setBodyValue(block.props.body || "");
  }, [block.props.title, block.props.body]);

  const updateProps = (patch) => {
    editor.updateBlock(block, {
      props: {
        ...block.props,
        ...patch,
      },
    });
  };

  const updateTitle = (value) => {
    setTitleValue(value);
    updateProps({ title: value });
  };

  const updateBody = (value) => {
    setBodyValue(value);
    updateProps({ body: value });
  };

  const insertText = (value) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? bodyValue.length;
    const end = textarea?.selectionEnd ?? bodyValue.length;
    const nextValue = `${bodyValue.slice(0, start)}${value}${bodyValue.slice(end)}`;
    const nextCursor = start + value.length;

    updateBody(nextValue);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const hasContent = titleValue.trim() || bodyValue.trim();

  if (!editor.isEditable && !hasContent) {
    return null;
  }

  if (!editor.isEditable) {
    return (
      <div
        className="my-6 rounded-lg border border-slate-200 bg-slate-50 p-5"
        data-math-block="true"
        data-title={titleValue}
        data-body={bodyValue}
      >
        {titleValue.trim() && <div className="mb-3 text-sm font-semibold text-slate-900">{titleValue}</div>}
        <pre className="whitespace-pre-wrap break-words font-serif text-base leading-8">{bodyValue}</pre>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" contentEditable={false} data-math-block="true">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 font-serif text-base text-white">∑</span>
          Math Block
        </div>
        <button
          type="button"
          className="rounded-md border px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => insertText(STARTER_BODY)}
        >
          Insert template
        </button>
      </div>

      <input
        className="mb-3 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        value={titleValue}
        onChange={(event) => updateTitle(event.target.value)}
        placeholder="Title, e.g. Quadratic formula or Trigonometry question"
      />

      <textarea
        ref={textareaRef}
        className="min-h-[180px] w-full resize-y rounded-md border border-slate-200 bg-white p-3 font-serif text-base leading-8 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        value={bodyValue}
        onChange={(event) => updateBody(event.target.value)}
        placeholder="Write concepts, formulas, examples, and questions. Use the symbol palette below."
      />

      <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        {SYMBOL_GROUPS.map((group) => (
          <div key={group.label} className="grid gap-2 sm:grid-cols-[92px_1fr]">
            <div className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {group.symbols.map((symbol) => (
                <button
                  key={`${group.label}-${symbol}`}
                  type="button"
                  className="min-h-8 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-serif text-sm text-slate-900 hover:border-slate-400 hover:bg-slate-100"
                  onClick={() => insertText(symbol)}
                  title={`Insert ${symbol}`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MathBlockSpec = createReactBlockSpec(
  {
    type: "math",
    propSchema: {
      ...defaultProps,
      title: { default: "" },
      body: { default: "" },
    },
    content: "none",
  },
  {
    render: MathBlock,
    meta: {
      selectable: false,
    },
    parse: (element) => {
      if (element.hasAttribute("data-math-block")) {
        return {
          title: element.getAttribute("data-title") || "",
          body: element.getAttribute("data-body") || element.textContent || "",
        };
      }
    },
    toExternalHTML: ({ block }) => (
      <div
        data-math-block="true"
        data-title={block.props.title}
        data-body={block.props.body}
        style={{
          padding: "16px",
          margin: "12px 0",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          backgroundColor: "#f8fafc",
        }}
      >
        {block.props.title ? (
          <div style={{ marginBottom: "8px", fontWeight: "bold", color: "#0f172a" }}>{block.props.title}</div>
        ) : null}
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "serif", lineHeight: 1.7, color: "#0f172a" }}>{block.props.body}</pre>
      </div>
    ),
  },
);
