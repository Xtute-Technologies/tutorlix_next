"use client";

import React from "react";
import NoteEnrollmentsList from "@/components/notes/NoteEnrollmentsList";
import { Users } from "lucide-react";

export default function NoteEnrollmentsPage() {
  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          {/* <Users className="h-8 w-8 text-primary" /> */}
          Student Enrollments
        </h1>
        <p className="text-muted-foreground">Manage student access to notes.</p>
      </div>

      <NoteEnrollmentsList userRole="admin" />
    </div>
  );
}
