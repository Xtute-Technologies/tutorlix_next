"use client";

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormBuilder } from "@/components/FormBuilder";
import { z } from "zod";
import { noteAPI, noteAccessAPI } from "@/lib/notesService";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Schema for form validation
const enrollmentSchema = z.object({
  student_id: z.number().int().positive("Student is required"),
  note: z.number().int().positive("Note is required"),
  access_type: z.enum(['manual', 'purchase', 'course_booking', 'free_enrollment']),
  valid_until: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export default function AdminNoteEnrollmentDialog({ 
  open, 
  onOpenChange, 
  enrollmentToEdit, 
  onSuccess 
}) {
  const [students, setStudents] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchOptions();
    }
  }, [open]);

  const fetchOptions = async () => {
    setLoadingOptions(true); // Don't block UI if options take time, but show loading state
    try {
        // Fetch Notes
        const notesRes = await noteAPI.getAll({ page_size: 100 }); 
        setNotes(notesRes.results.map(n => ({ value: n.id, label: n.title })));

        // Fetch Students (Active students only ideally) - Adjust page_size based on need
        // Assuming /api/auth/users/ supports role filtering.
        const usersRes = await axiosInstance.get('/api/auth/users/', { params: { role: 'student', page_size: 100 } });
        setStudents(usersRes.data.results.map(u => ({ value: u.id, label: `${u.full_name || u.username} (${u.email})` })));
        
    } catch (e) {
        console.error("Failed to load options", e);
        toast.error("Failed to load options. Please refresh.");
    } finally {
        setLoadingOptions(false);
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        // Ensure valid_until is formatted or null (FormBuilder/Zod might return empty string)
        valid_until: values.valid_until || null,
      };
      
      if (enrollmentToEdit) {
        // For editing, we update the existing enrollment
        // Note: Changing student/note might not be allowed strictly or might have side effects, 
        // but backend allows updating.
        await noteAccessAPI.update(enrollmentToEdit.id, payload);
        toast.success("Enrollment updated successfully");
      } else {
        await noteAccessAPI.grant(payload);
        toast.success("Enrollment created successfully");
      }
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || "Operation failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { 
      name: "student_id", 
      label: "Student", 
      type: "autocomplete", // Use autocomplete for search
      options: students,
      placeholder: "Select Student...",
      disabled: !!enrollmentToEdit // Usually we don't change student on edit, but if user wants, remove this.
      // User requirements: "edit these things". So maybe allow it.
      // Let's remove disabled for now.
    },
    { 
        name: "note", 
        label: "Note", 
        type: "autocomplete", 
        options: notes,
        placeholder: "Select Note..."
    },
    {
        name: "access_type",
        label: "Access Type",
        type: "select",
        options: [
            { value: 'manual', label: 'Manual Grant' },
            { value: 'purchase', label: 'Via Purchase' },
            { value: 'course_booking', label: 'Via Course Booking' },
            { value: 'free_enrollment', label: 'Free Enrollment' },
        ],
        placeholder: "Select Access Type"
    },
    {
        name: "valid_until",
        label: "Expires On (Leave empty for lifetime)",
        type: "datetime-local",
    },
    {
        name: "is_active",
        label: "Is Active Status",
        type: "checkbox",
        description: "Uncheck to revoke access immediately."
    }
  ];

  // Default values
  const defaultValues = enrollmentToEdit ? {
      student_id: enrollmentToEdit.student?.id,
      note: enrollmentToEdit.note, // PK
      access_type: enrollmentToEdit.access_type,
      valid_until: enrollmentToEdit.valid_until ? enrollmentToEdit.valid_until.slice(0, 16) : "", // Format for datetime-local
      is_active: enrollmentToEdit.is_active
  } : {
      access_type: 'manual',
      is_active: true
  };

  return (
     <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
             <DialogHeader>
                 <DialogTitle>{enrollmentToEdit ? "Edit Enrollment" : "Create New Enrollment"}</DialogTitle>
             </DialogHeader>
             {loadingOptions ? (
                 <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p>Loading students and notes...</p>
                 </div>
             ) : (
                 <FormBuilder 
                    fields={fields}
                    validationSchema={enrollmentSchema}
                    onSubmit={handleSubmit}
                    defaultValues={defaultValues}
                    submitLabel={enrollmentToEdit ? "Update Enrollment" : "Create Enrollment"}
                    isSubmitting={submitting}
                    onCancel={() => onOpenChange(false)}
                 />
             )}
         </DialogContent>
     </Dialog>
  );
}
