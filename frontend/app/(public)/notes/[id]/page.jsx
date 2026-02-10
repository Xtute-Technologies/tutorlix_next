"use client";

import { useParams } from "next/navigation";
import NoteDetailClient from "./NoteDetailClient";

export default function Page() {
  const params = useParams();
  const id = params?.id;

  return <NoteDetailClient id={id} />;
}
