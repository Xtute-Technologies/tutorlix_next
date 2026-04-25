import NoteDetailClient from "./NoteDetailClient";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.SITEMAP_API_URL ||
  "http://localhost:8000";

const FALLBACK_TITLE = "Study Notes for Maths, Full Stack Development, DSA & AI | Tutorlix";
const FALLBACK_DESCRIPTION =
  "Access clear study notes on Tutorlix for maths, full stack development, DSA, system design, AI and generative AI topics.";

async function fetchPublicNote(slug) {
  if (!slug) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/notes/${slug}/public_detail/`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const note = await fetchPublicNote(slug);

  if (!note) {
    return {
      title: FALLBACK_TITLE,
      description: FALLBACK_DESCRIPTION,
    };
  }

  const title = `${note.title} | Tutorlix`;
  const description = note.description || FALLBACK_DESCRIPTION;
  const canonical = `https://tutorlix.com/notes/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Page({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const initialNote = await fetchPublicNote(slug);

  return <NoteDetailClient slug={slug} initialNote={initialNote} />;
}
