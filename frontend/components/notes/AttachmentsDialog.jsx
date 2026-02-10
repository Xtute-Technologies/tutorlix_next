import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Paperclip, Upload, X, Trash2, FileText, Image as ImageIcon, Loader2, Edit2, Check, File } from "lucide-react";
import { noteAttachmentAPI } from "@/lib/notesService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AttachmentsDialog({ noteId, trigger, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Rename State
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const loadAttachments = useCallback(async () => {
    if (!noteId) return;
    try {
      setIsLoading(true);
      const data = await noteAttachmentAPI.getAll(noteId);
      setAttachments(data.results || data); // Handle both paginated and flat response
    } catch (error) {
      console.error("Failed to load attachments", error);
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (isOpen) {
      loadAttachments();
    }
  }, [isOpen, loadAttachments]);

  const notifyUpdate = () => {
      if (onUpdate) onUpdate();
  };

  // Drag and Drop State
  const [isDragActive, setIsDragActive] = useState(false);

  // Handle Drag Events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    processUpload(files[0]);
  };

  const processUpload = async (file) => {
    if (!noteId) {
       toast.error("Please save the note first before adding attachments.");
       return;
    }

    // Frontend Checks
    if (attachments.length >= 5) {
        toast.error("Maximum 5 attachments allowed per note.");
        return;
    }
    
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
        toast.error("File is too large. Maximum size is 100MB.");
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      await noteAttachmentAPI.upload(noteId, file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      });
      toast.success("File uploaded successfully");
      loadAttachments();
      notifyUpdate();
    } catch (error) {
      console.error("Upload failed", error);
      const msg = error.response?.data?.non_field_errors?.[0] || error.response?.data?.detail || error.response?.data?.file?.[0] || "Failed to upload file";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e) => {
      if (e.target.files && e.target.files.length > 0) {
          processUpload(e.target.files[0]);
          e.target.value = null;
      }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this attachment?")) {
      try {
        await noteAttachmentAPI.delete(id);
        setAttachments(prev => prev.filter(a => a.id !== id));
        toast.success("Attachment deleted");
        notifyUpdate();
      } catch (error) {
         toast.error("Failed to delete attachment");
      }
    }
  };

  const startEditing = (attachment) => {
    setEditingId(attachment.id);
    setEditName(attachment.file_name || "");
  };

  const saveFileName = async (id) => {
      if (!editName.trim()) return;
      try {
          await noteAttachmentAPI.rename(id, editName);
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, file_name: editName } : a));
          setEditingId(null);
          toast.success("Renamed successfully");
          notifyUpdate();
      } catch (error) {
          toast.error("Failed to rename");
      }
  };

  const getFileIcon = (type) => {
      if (type === 'pdf') return <FileText className="h-4 w-4 text-red-500" />;
      if (type === 'image') return <ImageIcon className="h-4 w-4 text-blue-500" />;
      return <File className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isUploading && setIsOpen(val)}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => isUploading && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Manage Attachments</DialogTitle>
          <DialogDescription>
            Upload documents or images to attach to this note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload Area */}
          <div 
            className={cn(
                "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "bg-muted/50 hover:bg-muted/70",
                isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isUploading ? (
               <div className="w-full space-y-2 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm font-medium">Uploading... {uploadProgress}%</p>
                  <Progress value={uploadProgress} className="w-full h-2" />
                  <p className="text-xs text-muted-foreground text-red-500">Do not close this window.</p>
               </div>
            ) : (
                <>
                    <Upload className={cn("h-10 w-10 text-muted-foreground mb-2", isDragActive && "text-primary")} />
                    <p className="text-sm text-muted-foreground mb-4 font-medium">
                        {isDragActive ? "Drop file to upload" : "Drag and drop or click to upload"}
                    </p>
                    <label>
                        <Input 
                            type="file" 
                            className="hidden" 
                            onChange={handleFileSelect}
                            disabled={isUploading}
                        />
                        <Button variant="secondary" asChild className="cursor-pointer pointer-events-none">
                            <span>Select File</span>
                        </Button>
                    </label>
                </>
            )}
          </div>

          {/* Attachments List */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell>
                    </TableRow>
                ) : attachments.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No attachments yet.
                        </TableCell>
                    </TableRow>
                ) : (
                    attachments.map((attachment) => (
                        <TableRow key={attachment.id}>
                            <TableCell>{getFileIcon(attachment.file_type)}</TableCell>
                            <TableCell>
                                {editingId === attachment.id ? (
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            value={editName} 
                                            onChange={(e) => setEditName(e.target.value)} 
                                            className="h-8 text-sm"
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => saveFileName(attachment.id)}>
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setEditingId(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <a href={attachment.file_url} target="_blank" rel="noreferrer" className="hover:underline hover:text-primary font-medium">
                                        {attachment.file_name || "Unnamed File"}
                                    </a>
                                )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                                {attachment.file_size_display}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditing(attachment)} disabled={isUploading}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(attachment.id)} disabled={isUploading}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
