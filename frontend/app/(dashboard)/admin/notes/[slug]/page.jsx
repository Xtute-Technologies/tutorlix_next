"use client";

import NoteForm from "@/components/notes/NoteForm";

export default function AdminNoteFormPage() {
  return <NoteForm basePath="/admin/notes" isAdmin={true} />;
}
