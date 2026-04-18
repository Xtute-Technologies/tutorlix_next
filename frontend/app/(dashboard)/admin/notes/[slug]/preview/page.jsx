import NotesPreview from "@/components/notes/NotesPreview";

export default async function AdminNotePreviewPage({ params }) {
  const { slug } = await params;

  return <NotesPreview slug={slug} backPath={`/admin/notes/${slug}`} />;
}
