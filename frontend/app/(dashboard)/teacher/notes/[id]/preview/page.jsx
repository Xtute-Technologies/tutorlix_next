"use client";

import NotesPreview from "@/components/notes/NotesPreview";
import { useParams } from "next/navigation";

export default function TeacherNotePreviewPage() {
  const params = useParams();
  const noteId = params.id;

  return (
    <NotesPreview 
        noteId={noteId} 
        backPath={`/teacher/notes/${noteId}`} 
    />
  );
}
