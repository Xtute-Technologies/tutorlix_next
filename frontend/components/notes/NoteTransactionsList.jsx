"use client";

import React, { useMemo } from 'react';
import DataTableServer from '@/components/DataTableServer';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from 'date-fns';
import { notePurchaseAPI } from "@/lib/notesService";
import { IndianRupee, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import UserHoverCard from '@/components/UserHoverCard';
import NoteHoverCard from '@/components/NoteHoverCard'; // Added import

export default function NoteTransactionsList({ 
  userRole = 'teacher', // 'admin' or 'teacher'
  dependencies = {}, 
  defaultPageSize = 10 
}) {
  const isAdmin = userRole === 'admin';

  const columns = useMemo(() => [
    {
      accessorKey: "purchase_id",
      header: "Transaction ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.purchase_id}</span>
      )
    },
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
      accessorKey: "note_title", // Updated accessor
      header: "Note",
      cell: ({ row }) => {
        const noteData = {
            id: row.original.note_id || row.original.note,
            title: row.original.note_title,
            price: row.original.price, // Available in transaction response
            // Add other fields if NoteHoverCard needs them and they are not in response (they might be fetched inside HoverCard if it supports ID loading)
        };
        
        // Dynamic link based on role
        const link = userRole === 'admin' 
            ? `/admin/notes/${noteData.id}/preview` 
            : `/teacher/notes/${noteData.id}`;

        return (
            <NoteHoverCard note={noteData} linkHref={link}>
                <span className="font-medium hover:underline cursor-pointer truncate max-w-[200px] block" title={row.original.note_title}>
                {row.original.note_title}
                </span>
            </NoteHoverCard>
        );
      },
    },
    {
        accessorKey: "final_amount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="flex items-center text-green-700 font-semibold">
              <IndianRupee className="h-3 w-3 mr-0.5" />
              {row.original.final_amount}
          </div>
        )
    },
    {
        accessorKey: "payment_status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.original.payment_status;
            if (status === 'paid' || status === 'completed') {
                return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
            }
            if (status === 'failed') {
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
            }
            if (status === 'pending') {
                return <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
            }
            return <Badge variant="secondary">{status}</Badge>;
        }
    },
    {
      accessorKey: "created_at", // Or payment_date
      header: "Date",
      cell: ({ row }) => {
        const date = row.original.payment_date || row.original.created_at;
        try {
          return (
            <div className="flex flex-col">
                <span className="text-xs font-medium">{format(new Date(date), "MMM d, yyyy")}</span>
                <span className="text-[10px] text-muted-foreground">{format(new Date(date), "h:mm a")}</span>
            </div>
          );
        } catch (e) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
      }
    }
  ], [userRole]);

  const fetchAdapter = useMemo(() => {
    return async (params) => {
      const { pageIndex, pageSize, search, ...rest } = params;
      
      // Teacher filter: Only show PAID transactions by default as requested
      // Admin gets all by default
      const finalParams = {
          page: pageIndex + 1,
          page_size: pageSize,
          search: search || "",
          ...rest
      };

      if (userRole === 'teacher') {
          finalParams.payment_status = 'paid';
      }

      try {
        const response = await notePurchaseAPI.getAll(finalParams);

        return {
          rows: response.results || [],
          pageCount: Math.ceil((response.count || 0) / pageSize),
          totalCount: response.count || 0,
        };
      } catch (error) {
        console.error("Transactions Fetch Error:", error);
        return { rows: [], pageCount: 0, totalCount: 0 };
      }
    };
  }, [userRole]);

  return (
    <div className="space-y-4">
      <DataTableServer
        fetchData={fetchAdapter}
        columns={columns}
        dependencies={dependencies}
        defaultPageSize={defaultPageSize}
        searchPlaceholder="Search transaction or student..."
      />
    </div>
  );
}
