import NotesPreview from "@/components/notes/NotesPreview";

export default async function TeacherNotePreviewPage({ params }) {
  const { slug } = await params;

  return <NotesPreview slug={slug} backPath={`/teacher/notes/${slug}`} />;
}
