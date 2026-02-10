"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import DataTableServer from '@/components/DataTableServer';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, FileText, Package, IndianRupee } from 'lucide-react';
import UserHoverCard from '@/components/UserHoverCard';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function TeacherNotesList({ 
  adapter, 
  dependencies, 
  userRole = 'teacher', // 'admin' or 'teacher'
  onEdit, // Kept for backwards compatibility or specialized actions, though Links prefered
  onDelete,
  defaultPageSize = 10 
}) {
  const isAdmin = userRole === 'admin';
  const basePath = isAdmin ? '/admin' : '/teacher';

  const columns = useMemo(() => {
    const cols = [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="max-w-[300px]">
            <div className="font-medium flex items-center gap-2">
              {row.original.note_type === "course_specific" ? (
                <Package className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              {row.original.title}
            </div>
            {row.original.description && (
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {row.original.description}
              </div>
            )}
          </div>
        ),
      },
    ];

    if (isAdmin) {
      cols.push({
        accessorKey: "creator",
        header: "Creator",
        cell: ({ row }) => {
          const creator = row.original.creator;
          // Robust handle for null creator
          const userObj = creator ? {
             full_name: `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || 'Unknown',
             email: creator.email,
             profile_image: creator.profile_image,
             ...creator
          } : { full_name: 'Unknown User' };

          if (!creator) return <span className="text-muted-foreground text-xs">-</span>;
          
          return (
            <UserHoverCard user={userObj} currentUserRole={userRole}>
                <div className="flex items-center gap-2 cursor-pointer">
                <Avatar className="h-6 w-6">
                    <AvatarImage src={creator.profile_image} />
                    <AvatarFallback className="text-[10px]">
                    {creator.full_name?.[0]}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-xs">
                    <span className="font-medium hover:underline decoration-dotted underline-offset-4">
                        {creator.full_name}
                    </span>
                    <span className="text-muted-foreground text-[10px]">{creator.email}</span>
                </div>
                </div>
            </UserHoverCard>
          );
        },
      });
    }

    cols.push(
      {
        accessorKey: "note_type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.original.note_type;
          return (
            <Badge variant={type === "course_specific" ? "default" : "secondary"}>
              {type === "course_specific" ? "Course Specific" : "Individual"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "privacy",
        header: "Privacy",
        cell: ({ row }) => {
          if (row.original.note_type === "course_specific") {
            return <span className="text-xs text-muted-foreground">Linked</span>;
          }
          const privacy = row.original.privacy;
          const privacyLabels = {
            public: "Public",
            logged_in: "Logged In",
            purchaseable: "Purchaseable",
          };
          return (
            <Badge variant="outline" className="text-xs">
              {privacyLabels[privacy] || privacy}
            </Badge>
          );
        },
      },
      {
        accessorKey: "product_name",
        header: "Product",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.product_name || "-"}</span>,
      }
    );


    cols.push({
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        if (row.original.note_type === "individual" && row.original.privacy === "purchaseable") {
          return (
            <div>
              {row.original.discounted_price ? (
                <div className="flex flex-col">
                  <span className="line-through text-xs text-muted-foreground">₹{row.original.price}</span>
                  <div className="flex items-center text-green-600 font-medium">
                    <IndianRupee className="h-3 w-3" />
                    {row.original.discounted_price}
                  </div>
                </div>
              ) : (
                <div className="flex items-center font-medium">
                  <IndianRupee className="h-3 w-3" />
                  {row.original.price}
                </div>
              )}
            </div>
          );
        }
        return <span className="text-muted-foreground text-sm">Free</span>;
      },
    });

    cols.push(
      {
        accessorKey: "is_draft",
        header: "Status",
        cell: ({ row }) => {
           return row.original.is_draft ? (
              <Badge variant="outline" className="text-muted-foreground border-dashed">Draft</Badge>
           ) : (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Published</Badge>
           );
        }
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const note = row.original;
          return (
            <div className="flex items-center gap-2">
              <Link 
                href={`${basePath}/notes/${note.id}/preview`}
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-muted-foreground hover:text-primary")}
                title="Preview"
              >
                <Eye className="h-4 w-4" />
              </Link>
              
              <Link 
                href={`${basePath}/notes/${note.id}`}
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-muted-foreground hover:text-primary")}
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Link>

              {onDelete && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(note.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      }
    );

    return cols;
  }, [isAdmin, userRole, basePath, onDelete]);

  return (
    <DataTableServer
      columns={columns}
      fetchData={adapter}
      dependencies={dependencies}
      defaultPageSize={defaultPageSize}
      searchKey="title"
      searchPlaceholder={isAdmin ? "Search by title or creator..." : "Search by title..."}
    />
  );
}
