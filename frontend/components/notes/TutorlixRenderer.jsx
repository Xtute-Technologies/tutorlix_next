"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import the Editor component to turn it into a Renderer
// We force 'readOnly' prop to true
const TutorlixEditor = dynamic(() => import("./TutorlixEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-64 space-y-4 text-muted-foreground/50">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm font-medium">Loading content...</p>
    </div>
  ),
});

export default function TutorlixRenderer({ content }) {
  return (
    <div className="prose prose-stone dark:prose-invert max-w-none">
      {/* We reuse the Editor logic but lock it down. 
        This ensures distinct visual parity between what the teacher wrote and what the student sees.
      */}
      <TutorlixEditor 
        initialContent={content} 
        readOnly={true} 
        showPDFExport={true} 
        onChange={() => {}} 
      />
    </div>
  );
}