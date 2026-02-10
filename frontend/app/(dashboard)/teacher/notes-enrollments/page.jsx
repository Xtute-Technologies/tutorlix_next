"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import NoteEnrollmentsList from "@/components/notes/NoteEnrollmentsList";
import { Users } from "lucide-react";

export default function TeacherNoteEnrollmentsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Notes Enrollments
        </h1>
        <p className="text-muted-foreground">
            View and manage students who have purchased or enrolled in your notes.
        </p>
      </div>

         <NoteEnrollmentsList userRole="teacher" />
    </div>
  );
}
