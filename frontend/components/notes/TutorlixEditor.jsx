"use client";

import React, { useState, useEffect } from "react";
import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs, defaultInlineContentSpecs, defaultStyleSpecs } from "@blocknote/core";
import { useTheme } from "next-themes";
import { codeBlockOptions } from "@blocknote/code-block";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { filterSuggestionItems } from "@blocknote/core/extensions"; // Directly from react package
import { BlockNoteView } from "@blocknote/mantine";
import { PDFExporter, pdfDefaultSchemaMappings } from "@blocknote/xl-pdf-exporter";
import * as ReactPDF from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Youtube } from "lucide-react";
import { noteImageAPI } from "@/lib/notesService";
import { toast } from "sonner";
import { YoutubeBlockSpec } from "./blocks/YoutubeBlock";
import { View, Text, Link } from "@react-pdf/renderer";
import { pdfStyles } from "./PDFStyles";
import "@blocknote/core/fonts/inter.css";
import { PDFTemplate } from "./PDFTemplate";
import "@blocknote/mantine/style.css";
// Define schema with default blocks + Custom YouTube block
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: createCodeBlockSpec(codeBlockOptions),
    youtube: YoutubeBlockSpec(),
  },
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: defaultStyleSpecs,
});

export default function TutorlixEditor({
  noteId,
  initialContent = null,
  onChange = null,
  showPDFExport = true,
  readOnly = false,
  onAttachmentAdded = null,
}) {
  const [isExporting, setIsExporting] = useState(false);
  const { resolvedTheme } = useTheme();

  // File upload handler (for images and documents)
  const uploadFile = async (file) => {
    try {
      // Use the generic upload API for all editor content
      // This allows embedding images and files without cluttering the formal "Attachments" list
      // and avoids the "save note first" restriction for editor content.
      const response = await noteImageAPI.upload(file);
      return response.url || response.image_url || response.file_url;
    } catch (error) {
      console.error("Upload failed:", error);
      const msg = error.response?.data?.error || error.response?.data?.non_field_errors?.[0] || error.message || "Failed to upload file";

      toast.error(msg);

      // Throwing error ensures BlockNote removes the optimistic block (no empty box)
      throw error;
    }
  };

  // Create the editor instance
  const editor = useCreateBlockNote({
    schema,
    initialContent: initialContent ? (Array.isArray(initialContent) ? initialContent : undefined) : undefined,
    uploadFile,
  });

  // Handle content changes
  useEffect(() => {
    if (!editor || !onChange || readOnly) return;

    const handleChange = () => {
      onChange(editor.document);
    };

    editor.onChange(handleChange);
  }, [editor, onChange, readOnly]);

  // Sync initial content updates (e.g. from DB fetch)
  useEffect(() => {
    if (!editor || !initialContent) return;

    const currentContent = JSON.stringify(editor.document);
    const newContent = JSON.stringify(initialContent);

    if (currentContent !== newContent && Array.isArray(initialContent)) {
      editor.replaceBlocks(editor.document, initialContent);
    }
  }, [editor, initialContent]);

  const handleExportPDF = async () => {
    if (!editor) return;
    setIsExporting(true);

    const exporter = new PDFExporter(editor.schema, {
      blockMapping: {
        ...pdfDefaultSchemaMappings.blockMapping,
        // Map the YouTube block for the PDF
        youtube: (block) => {
          return (
            <View style={pdfStyles.videoBox} wrap={false}>
              <Text style={pdfStyles.videoTitle}>📺 VIDEO CONTENT</Text>
              <Text style={pdfStyles.videoSubtitle}>A YouTube video was embedded here:</Text>
              <Link style={pdfStyles.videoLink} src={block.props.url}>
                {block.props.url}
              </Link>
            </View>
          );
        },
        codeBlock: (block) => {
          return (
            <View style={pdfStyles.codeBlock} wrap={false}>
              <Text>{block.content[0]?.text || ""}</Text>
            </View>
          );
        },
      },
      inlineContentMapping: pdfDefaultSchemaMappings.inlineContentMapping,
      styleMapping: pdfDefaultSchemaMappings.styleMapping,
    });

    try {
      const rawDoc = await exporter.toReactPDFDocument(editor.document);
      const blob = await ReactPDF.pdf(<PDFTemplate rawDoc={rawDoc} title="Course Note" />).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Note_Export_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF Downloaded!");
    } catch (error) {
      console.error("PDF export failed", error);
      toast.error("Failed to generate PDF. Some content types may not be supported yet.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!editor) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Loading Editor...</div>;
  }

  return (
    <div className="space-y-4 relative group">
      {/* Editor Toolbar (Optional for Read-Only or PDF Export) */}
      {showPDFExport && (
        <div className="flex justify-end border-b pb-2 mb-2">
          <Button
            onClick={handleExportPDF}
            variant="ghost"
            className="text-xs h-8 text-muted-foreground hover:text-primary"
            disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <FileDown className="mr-2 h-3 w-3" />}
            Export as PDF
          </Button>
        </div>
      )}

      {/* The BlockNote View */}
      <div className={`min-h-[300px] ${readOnly ? "" : ""}`}>
        <BlockNoteView
          editor={editor}
          editable={!readOnly}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          className="editor-container"
          slashMenu={false}>
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => {
              // Get default items
              const defaultItems = getDefaultReactSlashMenuItems(editor);

              // Filter out default Video and Audio from Media group
              const filteredItems = defaultItems.filter((item) => {
                if (item.group === "Media") {
                  return item.title !== "Video" && item.title !== "Audio";
                }
                return true;
              });

              // Define YouTube item
              const youtubeItem = {
                title: "YouTube Video",
                onItemClick: () => {
                  const currentBlock = editor.getTextCursorPosition().block;
                  const blockToInsert = { type: "youtube" };

                  // If current block is empty, replace it (standard behavior)
                  // But safest generic way:
                  editor.insertBlocks([blockToInsert], currentBlock, "after");
                },
                aliases: ["youtube", "video", "embed", "yt"],
                group: "Video",
                icon: <Youtube size={18} />,
                subtext: "Embed a YouTube video",
              };

              // Combine
              const allItems = [...filteredItems, youtubeItem];

              // Filter by query
              return filterSuggestionItems(allItems, query);
            }}
          />
        </BlockNoteView>
      </div>
    </div>
  );
}
