"use client";

import React, { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { Loader2, ArrowLeft, Download, FileText, Lock, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import TutorlixRenderer from "@/components/notes/TutorlixRenderer";
import NoteEnrollmentDialog from "@/components/notes/NoteEnrollmentDialog";
import { format } from "date-fns";

export default function NoteDetailPage({ params }) {
  const router = useRouter();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        setLoading(true);
        const id = params.id;
        const response = await axios.get(`/api/notes/${id}/`);
        setNote(response.data);
      } catch (err) {
        console.error("Error fetching note:", err);
        setError("Note not found or you don't have access.");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchNote();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto py-10 space-y-4 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-12 w-3/4" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg mt-8" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold text-foreground">Note Not Found</h2>
        <p className="text-muted-foreground mt-2">{error || "The requested note could not be retrieved."}</p>
        <Link href="/student/notes">
          <Button className="mt-6" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
          </Button>
        </Link>
      </div>
    );
  }

  const { title, description, creator, note_type, privacy, can_access, content, attachments, updated_at, access_duration_days } = note;
  const isCourseSpecific = note_type === 'course_specific';

  const handleEnrollSuccess = () => {
    window.location.reload();
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl min-h-screen pb-20 bg-background text-foreground">
      {/* Back Button */}
      <Link href={"/student/notes"}>
      <Button variant="ghost" size="sm" className="mb-6 pl-0 hover:bg-transparent hover:text-primary transition-colors text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      </Link>

      {/* Header Section */}
      <div className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {isCourseSpecific ? (
            <Badge variant="secondary">Course Note</Badge>
          ) : (
            <Badge variant="outline">Individual Note</Badge>
          )}

          {privacy === 'purchaseable' && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10">Premium</Badge>
          )}

          <div className="ml-auto flex items-center text-xs text-muted-foreground">
            <Calendar className="mr-1 h-3 w-3" />
            Updated {format(new Date(updated_at), 'MMM d, yyyy')}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight tracking-tight">
            {title}
          </h1>
          {/* Description placed directly below Title */}
          {description && (
            <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Creator Info */}
        {creator && (
          <div className="flex items-center gap-3 pt-4">
            <Avatar className="h-10 w-10 border border-border shadow-sm">
              <AvatarImage src={creator.profile_image} className="object-cover" />
              <AvatarFallback className="bg-muted">{creator.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-bold">{creator.full_name}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Author</p>
            </div>
          </div>
        )}
      </div>

      {/* Access Control / Main Content */}
      <div className="mt-8">
        {can_access ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. ATTACHMENTS (Moved to Top) */}
            {attachments && attachments.length > 0 && (
              <div className="p-6 rounded-2xl bg-muted/30 border border-border shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                  <Download className="h-4 w-4" /> Downloadable Resources
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url || file.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-3 border border-border rounded-xl bg-card hover:bg-muted transition-all group shadow-sm hover:shadow-md"
                    >
                      <div className="bg-primary/10 p-2.5 rounded-lg mr-3 group-hover:bg-primary/20 transition-colors">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{file.file_name || "Document"}</p>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground">{file.file_size_display || "Resource"}</p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 2. MAIN CONTENT RENDERER */}
            <div className="min-h-[400px] prose prose-stone dark:prose-invert max-w-none">
              <TutorlixRenderer content={content} />
            </div>
          </div>
        ) : (
          /* Locked State View */
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border-2 border-dashed border-border rounded-3xl text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="relative">
               <div className="bg-background p-6 rounded-full border border-border shadow-xl">
                  <Lock className="h-12 w-12 text-primary animate-pulse" />
               </div>
               <div className="absolute -top-1 -right-1 bg-yellow-500 h-4 w-4 rounded-full border-2 border-background shadow-sm" />
            </div>
            
            <div className="max-w-md space-y-3">
              <h2 className="text-3xl font-black tracking-tight">Content Locked</h2>
              <p className="text-muted-foreground leading-relaxed">
                {privacy === 'purchaseable'
                  ? "This premium note requires a one-time purchase to unlock full content, resources, and attachments."
                  : privacy === 'logged_in'
                  ? "Exclusive content for registered students. Enroll for free to add this to your library."
                  : "This note is part of a specific course curriculum. Enrollment in that course is required."}
              </p>
            </div>

            <div className="pt-4 flex flex-col items-center gap-4">
              {(privacy === 'purchaseable' || (privacy === 'logged_in' && !can_access)) ? (
                <NoteEnrollmentDialog
                  note={note}
                  onSuccess={handleEnrollSuccess}
                  trigger={
                    <Button size="lg" className="h-14 px-10 gap-3 text-base font-bold shadow-lg shadow-primary/20 rounded-2xl">
                      {(note.price > 0 && privacy === 'purchaseable') ? "Get Full Access Now" : "Enroll for Free"}
                    </Button>
                  }
                />
              ) : (
                <Button disabled variant="secondary" className="h-14 px-10 gap-3 rounded-2xl">
                  <Lock className="h-5 w-5" /> Course Enrollment Required
                </Button>
              )}

              {access_duration_days > 0 && (
                <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-full border border-border">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Access Duration: {access_duration_days} Days
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}