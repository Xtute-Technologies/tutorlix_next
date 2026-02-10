"use client";

import React, { useEffect, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useTheme } from "next-themes";

export default function Editor({ value, onChange }) {
  const { resolvedTheme } = useTheme();
  const [blocks, setBlocks] = useState([]);
  
  // Initialize editor
  const editor = useCreateBlockNote();

  // Helper to load initial HTML into blocks
  // We use a separate effect and state to ensure we only parse HTML once on mount/init
  // to prevent cursor jumping or re-rendering loops if we tried to sync 'value' constantly.
  useEffect(() => {
    async function loadHTML() {
      if (editor && value && blocks.length === 0) {
        const parsedBlocks = await editor.tryParseHTMLToBlocks(value);
        editor.replaceBlocks(editor.document, parsedBlocks);
        setBlocks(parsedBlocks);
      }
    }
    loadHTML();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]); // Run once when editor is ready

  return (
    <div className="border rounded-xl overflow-hidden bg-card text-card-foreground">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={async () => {
           // Convert blocks back to HTML on every change
           const html = await editor.blocksToHTMLLossy(editor.document);
           onChange(html);
        }}
        className="min-h-[300px]"
      />
    </div>
  );
}
