"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { noteAPI, noteAttachmentAPI } from "@/lib/notesService";
import { ArrowLeft, Loader2, Sparkles, Tag, Paperclip, FileText, Image as ImageIcon, File, Calendar, User, ShoppingCart, Clock } from "lucide-react";
import TutorlixEditor from "@/components/notes/TutorlixEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function NotesPreview({ noteId, backPath }) {
  const router = useRouter();
  const [note, setNote] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [noteData, attachmentsData] = await Promise.all([
          noteAPI.getById(noteId),
          noteAttachmentAPI.getAll(noteId)
        ]);
        setNote(noteData);
        setAttachments(attachmentsData.results || attachmentsData);
      } catch (error) {
        console.error("Failed to load note preview:", error);
        toast.error("Failed to load note data");
        // Fallback or redirect could happen here
      } finally {
        setIsLoading(false);
      }
    };

    if (noteId) {
      fetchData();
    }
  }, [noteId]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Note not found</p>
        <Button variant="outline" onClick={() => router.push(backPath)}>
          Go Back
        </Button>
      </div>
    );
  }

  const creator = note.creator || {};

  // Price Display Helper
  const PriceDisplay = ({ price, discountedPrice }) => {
    const p = parseFloat(price);
    const d = parseFloat(discountedPrice);

    if (!p) return <span className="text-muted-foreground text-sm font-medium">Free</span>;

    if (d && d < p) {
      const off = Math.round(((p - d) / p) * 100);
      return (
        <div className="flex items-center gap-2">
          <span className="font-bold text-green-600 text-lg">₹{d}</span>
          <span className="text-muted-foreground line-through text-sm">₹{p}</span>
          <Badge variant="destructive" className="h-5 px-1 text-[10px]">
            {off}% OFF
          </Badge>
        </div>
      );
    }
    return <span className="font-bold text-lg">₹{p}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(backPath)}
              className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <h1 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-md">
                Preview Mode
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <Badge variant={note.is_draft ? "outline" : "default"} className={cn(
                "capitalize",
                !note.is_draft ? "bg-green-600 hover:bg-green-700" : "text-muted-foreground border-dashed"
             )}>
                {note.is_draft ? "Draft" : "Published"}
             </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
        
        {/* Title & Description Header */}
        <div className="space-y-4 border-b pb-8">
           <div className="flex flex-col gap-2">
               <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                   <Calendar className="h-3.5 w-3.5" />
                   <span>Updated {new Date(note.updated_at).toLocaleDateString()}</span>
                   {note.creator && (
                       <>
                           <span className="mx-1">•</span>
                            <div className="flex items-center gap-1.5">
                                <Avatar className="h-4 w-4">
                                    <AvatarImage src={creator.profile_image} />
                                    <AvatarFallback className="text-[8px]">
                                        {creator.first_name?.[0]}{creator.last_name?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <span>{creator.full_name || creator.email}</span>
                            </div>
                       </>
                   )}
               </div>
               <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">{note.title}</h1>
           </div>
           
           {note.description && (
               <p className="text-xl text-muted-foreground leading-relaxed">
                   {note.description}
               </p>
           )}

           {/* Metadata Pills */}
           <div className="flex flex-wrap gap-3 pt-2">
                {/* Type */}
                <Badge variant="secondary" className="px-3 py-1 gap-1.5 h-8">
                    {note.note_type === 'individual' ? <Sparkles className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}
                    {note.note_type === 'individual' ? "Individual Note" : "Course Resource"}
                </Badge>

                {/* Classification / Product */}
                {note.note_type === 'course_specific' && note.product_name && (
                    <Badge variant="outline" className="px-3 py-1 gap-1.5 h-8">
                        <Tag className="h-3.5 w-3.5" />
                        {note.product_name}
                    </Badge>
                )}
                
                {/* Privacy */}
                {note.note_type !== 'course_specific' && (
                    <Badge variant="outline" className="px-3 py-1 gap-1.5 h-8 capitalize">
                        {note.privacy === 'logged_in' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Access: {note.privacy.replace("_", " ")}
                    </Badge>
                )}

                {/* Price (if applicable) */}
                {note.note_type === 'individual' && note.privacy === 'purchaseable' && (
                     <div className="flex items-center px-3 py-1 bg-muted/50 rounded-full h-8 border">
                        <ShoppingCart className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <PriceDisplay price={note.price} discountedPrice={note.discounted_price} />
                     </div>
                )}
                
                {/* Duration */}
                {note.access_duration_days > 0 && (
                     <Badge variant="outline" className="px-3 py-1 gap-1.5 h-8">
                        <Clock className="h-3.5 w-3.5" />
                        {note.access_duration_days} Days Access
                     </Badge>
                )}
           </div>
        </div>

        {/* Attachments Section */}
        {attachments.length > 0 && (
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Paperclip className="h-4 w-4" /> Attached Resources ({attachments.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {attachments.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                        <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-md shrink-0">
                            {file.file_type === 'pdf' ? <FileText className="h-5 w-5 text-red-500" /> : 
                                file.file_type === 'image' ? <ImageIcon className="h-5 w-5 text-blue-500" /> : 
                                <File className="h-5 w-5 text-gray-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" title={file.file_name}>
                                {file.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground pb-1">{file.file_size_display}</p>
                            {file.file_url && (
                                <a 
                                    href={file.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-primary hover:underline font-medium"
                                >
                                    Download
                                </a>
                            )}
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        )}

        {/* Content Render */}
        <div className="min-h-[400px]">
             <TutorlixEditor
                noteId={noteId}
                initialContent={note.content} 
                readOnly={true}
                showPDFExport={true}
            />
        </div>
      </main>
    </div>
  );
}
