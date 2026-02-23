"use client";

import NoteForm from "@/components/notes/NoteForm";

export default function TeacherNoteFormPage() {
  return <NoteForm basePath="/teacher/notes" isAdmin={false} />;
}
