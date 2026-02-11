"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { noteAPI, notePurchaseAPI } from "@/lib/notesService";
import { useAuth } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TutorlixRenderer from "@/components/notes/TutorlixRenderer";
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Lock,
  CheckCircle,
  Package,
  AlertCircle,
  FileText,
  Share2,
  Download,
  Loader2,
  File,
  Image as ImageIcon,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function NoteDetailClient({ initialNote, id }) {
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const { user, loading: authLoading } = useAuth();
  
  const [note, setNote] = useState(initialNote);
  const [loading, setLoading] = useState(!initialNote);
  const isAuthenticated = !!user;
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // --- 0. Data Fetching Logic (for Client-Side Only mode) ---
  useEffect(() => {
    if (!note && id) {
      const fetchNote = async () => {
        try {
          // Use public_detail endpoint to ensure we get data even if not logged in
          // or if the note is protected (so we can show the "Locked" UI)
          const data = await noteAPI.getPublicDetail(id);
          setNote(data);
        } catch (error) {
          console.error("Failed to fetch note:", error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchNote();
    }
  }, [id, note]);

  // --- 1. Auth & Redirection Logic ---
  useEffect(() => {
    if (!authLoading && user) {
       // Role-based redirection preference
       if (user.role === 'student') {
          setIsRedirecting(true);
          router.replace(`/student/notes/${id}`);
          return;
       }
       // Teacher Viewing Public Page: Do NOT redirect (as per requirement)
       /* if (user.role === 'teacher') {
          setIsRedirecting(true);
          router.replace(`/teacher/notes/${id}`);
          return; 
       } */
       if (user.role === 'admin') {
          setIsRedirecting(true);
          router.replace(`/admin/notes/${id}`);
          return; 
       }
    }
  }, [id, user, authLoading, router]);

  if (isRedirecting) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  // --- 2. Purchase Logic ---
  const handlePurchase = async () => {
    if (!isAuthenticated) {
     openAuthModal();
      return;
    }

    setIsPurchasing(true);
    try {
      const response = await notePurchaseAPI.create({ note: note.id });

      if (response.payment_link) {
        window.location.href = response.payment_link;
      } else {
        toast.success("Access granted!");
        // Refresh note data to get access update
        const updated = await noteAPI.getById(id);
        setNote(updated);
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error(error.response?.data?.detail || "Failed to initiate purchase");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    setIsPurchasing(true);
    try {
      await noteAPI.enroll(note.id);
      toast.success("Enrolled successfully!");
      const updated = await noteAPI.getById(id);
      setNote(updated);
    } catch (error) {
      console.error("Enrollment error:", error);
      toast.error(error.response?.data?.detail || "Failed to enroll");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
    toast.success("Link copied to clipboard!");
  };

  // --- 3. Rendering ---

  // Handle case where server fetch failed or 404
  if (loading || isRedirecting || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">
           {isRedirecting ? "Redirecting to your dashboard..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container mx-auto py-20 px-4">
        <Card className="p-12 text-center max-w-lg mx-auto shadow-lg">
          <div className="bg-red-50 dark:bg-red-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Note Not Found</h2>
          <p className="text-muted-foreground mb-8">
            This note may have been removed, or is not publicly available.
          </p>
          <Button onClick={() => router.push("/notes")} variant="default" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Browse All Notes
          </Button>
        </Card>
      </div>
    );
  }

  const canAccess = note.can_access;
  const hasPurchased = note.has_purchased;
  const isFree = !note.price || Number(note.price) === 0;
  const isPubliclyVisible = note.privacy === 'public';

  const shouldShowContent = canAccess || isPubliclyVisible;

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(note.discounted_price || note.price || 0);

  const originalPrice = note.discounted_price ? new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(note.price) : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero / Header Section */}
      <div className="bg-muted/30 border-b pb-12 pt-8">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <Link href="/notes">
          <Button variant="ghost" className="mb-6 pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
          </Button>
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant={note.note_type === "course_specific" ? "default" : "secondary"}
                  className="uppercase tracking-wider text-[10px] px-2 py-0.5">
                  {note.note_type === "course_specific" ? "Course Material" : "Individual Note"}
                </Badge>
                {note.is_draft && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                    Draft Preview
                  </Badge>
                )}
                {hasPurchased && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 pl-1">
                    <CheckCircle className="h-3 w-3 fill-green-700 text-white" /> Owned
                  </Badge>
                )}
                {isPubliclyVisible && (
                   <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 pl-1">
                    <CheckCircle className="h-3 w-3 fill-blue-700 text-white" /> Public Access
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">{note.title}</h1>

              {note.description && <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">{note.description}</p>}

              {/* Author & Meta */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-2">
                <div className="flex items-center gap-2">
                   <Avatar className="h-8 w-8 border">
                      <AvatarImage src={note.creator?.profile_image} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {note.creator?.full_name?.[0] || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  <span className="font-medium text-foreground">{note.creator?.full_name || "Instructor"}</span>
                </div>
                <Separator orientation="vertical" className="h-4 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(note.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                {note.access_duration_days !== undefined && note.access_duration_days !== null && (
                  <div className="flex items-center gap-1.5" title="Access Duration">
                    <Clock className="h-4 w-4" />
                    <span>{note.access_duration_days === 0 ? "Lifetime Access" : `${note.access_duration_days} Days Access`}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Card (Price/Purchase) */}
            <Card className="w-full md:w-[320px] p-6 shadow-md border-muted-foreground/10 bg-card/50 backdrop-blur-sm">
              {canAccess || isPubliclyVisible ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 font-medium pb-2 border-b">
                     {isPubliclyVisible ? (
                       <>
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                        <span className="text-blue-600">Free Public Content</span>
                       </>
                     ) : (
                        <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Access Granted</span>
                        </>
                     )}
                  </div>
                  <Button className="w-full" variant="outline" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" /> Share Note
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">You have full access to this content.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {isFree ? "Free Access" : "One-time purchase"}
                    </p>
                    <div className="flex items-baseline gap-2">
                      {note.discounted_price ? (
                        <>
                          <span className="text-3xl font-bold text-primary">{formattedPrice}</span>
                          <span className="text-lg text-muted-foreground line-through">{originalPrice}</span>
                        </>
                      ) : (
                        <span className="text-3xl font-bold text-primary">{isFree ? "Free" : formattedPrice}</span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full font-semibold shadow-lg shadow-primary/20"
                    onClick={isFree ? handleEnroll : handlePurchase}
                    disabled={isPurchasing || (isAuthenticated && user?.role === 'teacher')}>
                    {isPurchasing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                      </>
                    ) : isAuthenticated ? (
                      user?.role === 'teacher' ? (
                         <><Lock className="mr-2 h-4 w-4" /> Student Only Content</>
                      ) : (
                         <>{isFree ? "Enroll for Free" : "Get Access Now"}</>
                      )
                    ) : (
                      <>{isFree ? "Login to Enroll" : "Login to Purchase"}</>
                    )}
                  </Button>

                  {note.product_name && (
                    <div className="rounded-md bg-muted p-3 text-xs flex gap-2 items-start">
                      <Package className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>
                        Also available as part of the <strong>{note.product_name}</strong> course.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="container mx-auto max-w-5xl py-12 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Content */}
          <div className="lg:col-span-3 space-y-8">
            {shouldShowContent ? (
              <>
                {/* Attachments Section - Moved to Top */}
                {note.attachments && note.attachments.length > 0 && (
                  <div className="mb-8 p-6 rounded-xl border bg-card/50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                       <Download className="h-5 w-5 text-primary" /> Attached Resources
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {note.attachments.map((file) => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors group gap-3">
                          <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-md shrink-0 border">
                             {file.file_type === 'pdf' ? <FileText className="h-5 w-5 text-red-500" /> : 
                              file.file_type === 'image' ? <ImageIcon className="h-5 w-5 text-blue-500" /> : 
                              <File className="h-5 w-5 text-gray-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                                {file.file_name || "Attachment"}
                            </p>
                            <p className="text-xs text-muted-foreground">{file.file_size_display}</p>
                          </div>
                          <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <TutorlixRenderer content={note.content} />
              </>
            ) : (
              <div className="relative rounded-xl border bg-card p-12 text-center overflow-hidden">
                {/* Blur Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90 z-10" />
                <div className="absolute inset-0 blur-[2px] opacity-30 select-none pointer-events-none p-10">
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua. Ut enim ad minim veniam...
                  </p>
                </div>

                <div className="relative z-20 flex flex-col items-center justify-center max-w-md mx-auto pt-8">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-6">
                    <Lock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Content Locked</h2>
                  <p className="text-muted-foreground mb-8">
                    This content is reserved for enrolled students or purchasers. Unlock this note to get immediate access to the full study
                    material and downloads.
                  </p>
                  <Button 
                    size="lg" 
                    onClick={isFree ? handleEnroll : handlePurchase} 
                    className="px-8 shadow-lg"
                    disabled={isAuthenticated && user?.role === 'teacher'}
                  >
                    {isAuthenticated ? (
                      user?.role === 'teacher' ? (
                        <><Lock className="mr-2 h-4 w-4" /> Student Only Content</>
                      ) : (
                        isFree ? "Enroll for Free" : "Unlock Now"
                      )
                    ) : (
                      isFree ? "Login to Enroll" : "Login to Unlock"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
