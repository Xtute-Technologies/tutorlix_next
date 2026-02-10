"use client";

import React, { useMemo, useState, useCallback } from 'react';
import DataTableServer from '@/components/DataTableServer';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from 'date-fns';
import { CreditCard, UserCheck, ShieldCheck, CalendarClock, Pencil, Plus } from 'lucide-react';
import UserHoverCard from '@/components/UserHoverCard';
import NoteHoverCard from '@/components/NoteHoverCard';
import { noteAccessAPI } from "@/lib/notesService";
import { Button } from "@/components/ui/button";
import AdminNoteEnrollmentDialog from "@/components/notes/AdminNoteEnrollmentDialog";

export default function NoteEnrollmentsList({ 
  userRole = 'teacher', // 'admin' or 'teacher'
  dependencies = {}, // To trigger refresh if needed
  defaultPageSize = 10
}) {
  const isAdmin = userRole === 'admin';
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEdit = useCallback((enrollment) => {
    setSelectedEnrollment(enrollment);
    setAdminDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedEnrollment(null);
    setAdminDialogOpen(true);
  }, []);

  // 1. Memoized Columns
  const columns = useMemo(() => {
    const cols = [
      {
        accessorKey: "student",
        header: "Student",
        cell: ({ row }) => {
          const student = row.original.student;
          if (!student) return <span className="text-muted-foreground">-</span>;
          
          return (
            <UserHoverCard user={student} currentUserRole={userRole}>
              <div className="flex items-center gap-2 cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={student.profile_image} />
                  <AvatarFallback>{student.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium hover:underline">
                    {student.full_name} 
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-1">{student.email}</span>
                </div>
              </div>
            </UserHoverCard>
          );
        },
      },
      {
        accessorKey: "note_title",
        header: "Note",
        cell: ({ row }) => {
            const noteData = row.original.note_details || {
                id: row.original.note, 
                title: row.original.note_title,
                price: 0 // Fallback
            };
            // Dynamic link based on current view/role - Pointing to PREVIEW
            const link = userRole === 'admin' 
                ? `/admin/notes/${noteData.id}/preview` 
                : `/teacher/notes/${noteData.id}/preview`;
            
            return (
              <NoteHoverCard note={noteData} linkHref={link}>
                  <div className="flex flex-col max-w-[200px]">
                    <span className="font-medium truncate underline decoration-dotted underline-offset-4 cursor-pointer" title={row.original.note_title}>
                      {row.original.note_title}
                    </span>
                  </div>
              </NoteHoverCard>
            );
        },
      },
      {
        accessorKey: "access_type",
        header: "Access Type",
        cell: ({ row }) => {
          const type = row.original.access_type;
          const config = {
            purchase: { label: 'Purchase', icon: CreditCard, variant: 'default' },
            course_booking: { label: 'Course', icon: CalendarClock, variant: 'secondary' },
            manual: { label: 'Manual Grant', icon: ShieldCheck, variant: 'outline' },
            free_enrollment: { label: 'Free', icon: UserCheck, variant: 'secondary' },
          };
          const conf = config[type] || { label: type, icon: UserCheck, variant: 'outline' };
          const Icon = conf.icon;
          
          return (
            <Badge variant={conf.variant} className="gap-1 whitespace-nowrap">
              <Icon className="h-3 w-3" /> {conf.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "valid_until",
        header: "Expires",
        cell: ({ row }) => {
          const date = row.original.valid_until;
          if (!date) return <span className="text-green-600 text-xs font-bold uppercase tracking-tighter">Lifetime</span>;
          try {
            return <span className="text-xs">{format(new Date(date), "MMM d, yyyy")}</span>;
          } catch (e) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
        }
      },
      {
        accessorKey: "created_at",
        header: "Enrolled On",
        cell: ({ row }) => {
          try {
            return <span className="text-xs text-muted-foreground">{format(new Date(row.original.created_at), "MMM d, yyyy")}</span>;
          } catch (e) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
        }
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          row.original.is_active 
            ? <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
            : <Badge variant="destructive">Inactive</Badge>
        )
      }
    ];

    if (isAdmin) {
      cols.push({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
        )
      });
    }

    return cols;
  }, [userRole, isAdmin, handleEdit]);

  // 2. Memoized Data Fetcher (Adapter Pattern)
  // This is the "Secret Sauce" that stops the infinite loop
  const enrollmentsAdapter = useMemo(() => {
    return async (params) => {
      const { pageIndex, pageSize, search, ...rest } = params;
      try {
        const response = await noteAccessAPI.getAll({
          page: pageIndex + 1,
          page_size: pageSize,
          search: search || "",
          ...rest // Spread other dependencies like filters
        });

        return {
          rows: response.results || [],
          pageCount: Math.ceil((response.count || 0) / pageSize),
          totalCount: response.count || 0,
        };
      } catch (error) {
        console.error("Enrollment Fetch Error:", error);
        return { rows: [], pageCount: 0, totalCount: 0 };
      }
    };
  }, []); // Static reference unless you need to recreate the whole logic

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add Enrollment
          </Button>
        </div>
      )}

      <DataTableServer
        fetchData={enrollmentsAdapter}
        columns={columns}
        dependencies={{ ...dependencies, refreshTrigger }}
        defaultPageSize={defaultPageSize}
      />

      {isAdmin && (
        <AdminNoteEnrollmentDialog 
          open={adminDialogOpen}
          onOpenChange={setAdminDialogOpen}
          enrollmentToEdit={selectedEnrollment}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
    </div>
  );
}