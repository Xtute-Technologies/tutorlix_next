"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, FileText, ShoppingCart, Eye, Package, IndianRupee, Info } from "lucide-react";
import NoteEnrollmentDialog from "./NoteEnrollmentDialog";
import { useAuthModal } from "@/context/AuthModalContext";
import { useAuth } from "@/context/AuthContext";

export default function NoteCard({ note }) {
  const { openAuthModal } = useAuthModal();
  const { isAuthenticated, user } = useAuth();

  const isPurchaseable = note.privacy === 'purchaseable';
  const hasAccess = note.can_access;
  const isCourseSpecific = note.note_type === 'course_specific';
  
  // Determine pricing display
  const renderPrice = () => {
    if (isPurchaseable && hasAccess) return null;
    if (!isPurchaseable) return <span className="text-green-600 font-medium">Free</span>;
    
    if (note.discounted_price) {
      return (
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground line-through">₹{note.price}</span>
          <span className="text-green-600 font-bold flex items-center">
             <IndianRupee className="h-3 w-3" />{note.discounted_price}
          </span>
        </div>
      );
    }
    return (
       <div className="text-green-600 font-bold flex items-center">
            <IndianRupee className="h-3 w-3" />{note.price}
       </div>
    );
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <div className="flex gap-2">
            {isCourseSpecific ? (
                <Badge variant="secondary" className="text-[10px] px-1 h-5 gap-1">
                    <Package className="h-3 w-3" /> Course
                </Badge>
            ) : (
                <Badge variant="outline" className="text-[10px] px-1 h-5 gap-1">
                    <FileText className="h-3 w-3" /> Note
                </Badge>
            )}
            
            {isPurchaseable && (
                <Badge variant="outline" className="text-[10px] px-1 h-5 border-yellow-500 text-yellow-600 bg-yellow-50">
                    Premium
                </Badge>
            )}
          </div>
          {renderPrice()}
        </div>
        <CardTitle className="text-lg line-clamp-2 leading-tight min-h-[3rem]">
            {note.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 pb-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
            {note.description || "No description available."}
        </p>
        
        {isCourseSpecific && note.product_name && (
            <div className="mt-3 bg-muted/50 p-2 rounded text-xs text-muted-foreground flex items-center gap-2">
                <Package className="h-3 w-3 shrink-0" />
                <span className="truncate">From: {note.product_name}</span>
            </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0">
        {hasAccess || note.privacy === 'public' || (note.privacy === 'logged_in' && isAuthenticated) ? (
            <Link href={isAuthenticated && user?.role === 'student' ? `/student/notes/${note.id}` : `/notes/${note.id}`} className="w-full">
                <Button className="w-full gap-2" variant="default">
                    <Eye className="h-4 w-4" /> View Note
                </Button>
            </Link>
        ) : (
            <div className="flex gap-2 w-full">
                <Link href={`/notes/${note.id}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                       <Info className="h-4 w-4" /> Preview
                    </Button>
                </Link>

                {isAuthenticated ? (
                    user?.role === 'teacher' ? (
                        <Button className="flex-1 gap-2 cursor-not-allowed" variant="secondary" disabled>
                             <Lock className="h-4 w-4" /> Student Only
                        </Button>
                    ) : (
                    <NoteEnrollmentDialog 
                        note={note} 
                        trigger={
                            <Button className="flex-1 gap-2" variant={isPurchaseable ? "default" : "secondary"}>
                                {isPurchaseable ? (
                                    <>
                                        <ShoppingCart className="h-4 w-4" /> Enroll
                                    </>
                                ) : (
                                    <>
                                        <Lock className="h-4 w-4" /> Locked
                                    </>
                                )}
                            </Button>
                        } 
                    />
                    )
                ) : (
                    <Button 
                        className="flex-1 gap-2" 
                        variant={isPurchaseable ? "default" : "secondary"}
                        onClick={() => openAuthModal('login')}
                    >
                        {isPurchaseable ? (
                                <>
                                    <ShoppingCart className="h-4 w-4" /> Enroll
                                </>
                            ) : (
                                <>
                                    <Lock className="h-4 w-4" /> Login to Access
                                </>
                            )}
                    </Button>
                )}
            </div>
        )}
      </CardFooter>
    </Card>
  );
}
