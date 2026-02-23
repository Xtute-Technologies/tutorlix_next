"use client";

import { useParams } from "next/navigation";
import NoteDetailClient from "./NoteDetailClient";

export default function Page() {
  const params = useParams();
  const slug = params?.slug;

  return <NoteDetailClient slug={slug} />;
}
