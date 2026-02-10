"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { noteAPI, noteAttachmentAPI } from "@/lib/notesService";
import { productAPI } from "@/lib/lmsService";
import axiosInstance from "@/lib/axios";
import { ArrowLeft, CheckCircle2, CloudUpload, Settings2, Pencil, Sparkles, Tag, Paperclip, FileText, Image as ImageIcon, File, Loader2, User as UserIcon, Eye } from "lucide-react";
import { toast } from "sonner";
import TutorlixEditor from "@/components/notes/TutorlixEditor";
import { AttachmentsDialog } from "@/components/notes/AttachmentsDialog";
import { cn } from "@/lib/utils";

export default function NoteForm({ basePath = "/teacher/notes", isAdmin = false }) {
  const router = useRouter();
  const params = useParams();
  const noteId = params.id !== "new" ? params.id : null;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [products, setProducts] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [creators, setCreators] = useState([]); // For Admin
  const autoSaveTimeoutRef = useRef(null);

  // Unified state for whether the "Edit Details" dialog is open
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: {},
    note_type: "individual",
    privacy: "logged_in",
    product: "",
    creator: "", // Admin only
    price: "",
    discounted_price: "",
    // access_duration_days: "",
    is_draft: true,
  });

  const [creatorName, setCreatorName] = useState("");

  useEffect(() => {
    loadInitialData();
  }, [noteId]);

  const fetchAttachments = useCallback(async () => {
    if (!noteId) return;
    try {
      const data = await noteAttachmentAPI.getAll(noteId);
      setAttachments(data.results || data);
    } catch (error) {
      console.error("Failed to fetch attachments", error);
    }
  }, [noteId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const autoSave = useCallback(async () => {
    if (!noteId || isSubmitting) return;
    setIsSaving(true);
    try {
      const payload = buildPayload();
      await noteAPI.autoSave(noteId, payload);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Auto-save error:", error);
    } finally {
      setIsSaving(false);
    }
  }, [noteId, formData, isSubmitting]);

  useEffect(() => {
    if (!noteId) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => autoSave(), 3000);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [formData, autoSave]);

  const buildPayload = () => {
    const payload = {
      title: formData.title,
      description: formData.description,
      content: formData.content,
      note_type: formData.note_type,
      is_draft: formData.is_draft,
    };
    
    if (isAdmin && formData.creator) {
        payload.creator = formData.creator;
    }

    if (formData.note_type === "course_specific") {
      if (formData.product) payload.product = formData.product;
      payload.privacy = formData.privacy; // Send default privacy
    } else {
      payload.privacy = formData.privacy;
      if (formData.privacy === "purchaseable") {
        payload.price = formData.price;
        payload.discounted_price = formData.discounted_price;
        // payload.access_duration_days = formData.access_duration_days;
      }
    }
    return payload;
  };

  const loadInitialData = async () => {
    try {
      const promises = [
        productAPI.getAll(isAdmin ? {} : { my_products: "true" }), // Admin gets all products
        noteId ? noteAPI.getById(noteId) : Promise.resolve(null),
      ];
      
      if (isAdmin) {
          // Fetch users (Teachers and Admins)
          promises.push(axiosInstance.get('/api/auth/users/')); 
      }

      const [productsData, noteData, usersData] = await Promise.all(promises);
      setProducts(Array.isArray(productsData) ? productsData : productsData.results || []);

      if (isAdmin && usersData) {
          const allUsers = usersData.data?.results || usersData.data || [];
          // Filter for teachers and admins
          const eligibleCreators = allUsers.filter(u => ['teacher', 'admin'].includes(u.role));
          setCreators(eligibleCreators);
      }

      if (noteData) {
        setFormData({
          title: noteData.title || "",
          description: noteData.description || "",
          content: noteData.content || {},
          note_type: noteData.note_type || "individual",
          privacy: noteData.privacy || "logged_in",
          product: (noteData.product?.id || noteData.product || "").toString(),
          creator: (noteData.creator?.id || noteData.creator || "").toString(),
          price: noteData.price || "",
          discounted_price: noteData.discounted_price || "",
          // access_duration_days: noteData.access_duration_days || "",
          is_draft: noteData.is_draft ?? true,
        });
        
        if (noteData.creator) {
            setCreatorName(typeof noteData.creator === 'object' ? 
                `${noteData.creator.first_name || ''} ${noteData.creator.last_name || ''}`.trim() || noteData.creator.email : 
                "");
        }

      } else {
        // If new note, open dialog immediately
        setIsConfigOpen(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load initial data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      if (noteId) {
        await noteAPI.update(noteId, payload);
        toast.success("Changes saved successfully");
      } else {
        const created = await noteAPI.create(payload);
        toast.success("Note initialized!");
        router.push(`${basePath}/${created.id}`);
        return;
      }
    } catch (error) {
      const serverErrors = error.response?.data;
      if (serverErrors && typeof serverErrors === "object") {
        Object.entries(serverErrors).forEach(([key, value]) => {
          toast.error(`${key}: ${Array.isArray(value) ? value[0] : value}`);
        });
      } else {
        toast.error("An unexpected error occurred while saving");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Helper to render Price with Discount ---
  const PriceDisplay = ({ price, discountedPrice }) => {
    const p = parseFloat(price);
    const d = parseFloat(discountedPrice);

    if (!p) return <span className="text-muted-foreground text-xs">Free</span>;

    if (d && d < p) {
      const off = Math.round(((p - d) / p) * 100);
      return (
        <div className="flex items-center gap-2">
          <span className="font-bold text-green-600">₹{d}</span>
          <span className="text-muted-foreground line-through text-xs">₹{p}</span>
          <Badge variant="destructive" className="h-5 px-1 text-[10px]">
            {off}% OFF
          </Badge>
        </div>
      );
    }
    return <span className="font-bold">₹{p}</span>;
  };

  // Find selected product object for display
  const selectedProduct = products.find((p) => p.id.toString() === formData.product);

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur transition-all">
        <div className="container mx-auto max-w-5xl flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(basePath)}
              className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>

            {/* Desktop Status */}
            <div className="hidden md:flex items-center gap-3 border-l pl-4 ml-2">
              {isSaving ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" /> Syncing...
                </div>
              ) : lastSaved ? (
                <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CloudUpload className="h-3 w-3" /> Auto-save on
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-muted/30 rounded-full px-3 py-1">
              <Switch
                checked={!formData.is_draft}
                onCheckedChange={(c) => setFormData({ ...formData, is_draft: !c })}
                className="scale-75 data-[state=checked]:bg-green-500"
              />
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors",
                  formData.is_draft ? "text-muted-foreground" : "text-green-600",
                )}>
                {formData.is_draft ? "Draft" : "Published"}
              </span>
            </div>

            {/* Attachments Dialog (Only for saved notes) */}
            {noteId && (
              <>
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`${basePath}/${noteId}/preview`)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Preview Note"
                  >
                    <Eye className="h-5 w-5" />
                 </Button>

                <AttachmentsDialog 
                  noteId={noteId} 
                  onUpdate={fetchAttachments}
                  trigger={
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <Paperclip className="h-5 w-5" />
                    </Button>
                  } 
                />
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsConfigOpen(true)}
              className="text-muted-foreground hover:text-foreground">
              <Settings2 className="h-5 w-5" />
            </Button>

            <Button onClick={(e) => handleSubmit(e)} disabled={isSubmitting} size="sm" className="px-4 sm:px-6 font-semibold shadow-md">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 sm:px-6 pt-12">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Read-Only Title & Description (Click to Edit) */}
          <div
            onClick={() => setIsConfigOpen(true)}
            className="group relative space-y-4 cursor-pointer rounded-xl p-2 -ml-2 hover:bg-muted/30 transition-colors">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground">
                <Pencil className="h-3 w-3" /> Edit Details
              </Button>
            </div>

            <h1
              className={cn(
                "font-extrabold tracking-tight text-foreground leading-tight break-words",
                formData.title ? "text-3xl sm:text-4xl md:text-5xl" : "text-3xl text-muted-foreground italic",
              )}>
              {formData.title || "Untitled Note"}
            </h1>

            <p
              className={cn(
                "text-lg sm:text-xl leading-relaxed max-w-3xl",
                formData.description ? "text-muted-foreground" : "text-muted-foreground/50 italic",
              )}>
              {formData.description || "No description provided. Click to add a summary..."}
            </p>
          </div>

          {/* Minimal Meta Info Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 border-y border-border/60 py-6 text-sm">
            {/* Item 1: Type */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {formData.note_type === "individual" ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : (
                  <Tag className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Type</span>
                <span className="font-medium text-foreground">
                  {formData.note_type === "individual" ? "Standalone Note" : "Course Resource"}
                </span>
              </div>
            </div>

            {/* Item 2: Context (Course or Privacy) */}
            <div className="h-8 w-px bg-border hidden sm:block" />

            {formData.note_type === "course_specific" ? (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Linked Course</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">
                    {selectedProduct?.name || "No course selected"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Access</span>
                <Badge variant="secondary" className="w-fit mt-0.5 font-medium capitalize">
                  {formData.privacy.replace("_", " ")}
                </Badge>
              </div>
            )}
            
            {/* Admin Creator Info */}
            {isAdmin && creatorName && (
                <>
                <div className="h-8 w-px bg-border hidden sm:block" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Creator</span>
                     <div className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">{creatorName}</span>
                    </div>
                </div>
                </>
            )}

            {/* Item 3: Pricing (Conditional) */}
            {formData.note_type === "individual" && formData.privacy === "purchaseable" && (
              <>
                <div className="h-8 w-px bg-border hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    {formData.note_type === "course_specific" ? "Course Price" : "Note Price"}
                  </span>
                  <div className="mt-0.5">
                    <PriceDisplay price={formData.price} discountedPrice={formData.discounted_price} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Attachments List */}
          {attachments.length > 0 && (
             <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                   <Paperclip className="h-4 w-4" /> Attachments ({attachments.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                   {attachments.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group">
                         <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-md shrink-0">
                            {file.file_type === 'pdf' ? <FileText className="h-5 w-5 text-red-500" /> : 
                             file.file_type === 'image' ? <ImageIcon className="h-5 w-5 text-blue-500" /> : 
                             <File className="h-5 w-5 text-gray-500" />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" title={file.file_name}>
                               {file.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{file.file_size_display}</p>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <AttachmentsDialog 
                               noteId={noteId} 
                               onUpdate={fetchAttachments}
                               trigger={
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                     <Settings2 className="h-3 w-3" />
                                  </Button>
                               } 
                            />
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* Editor Canvas */}
          <div className="min-h-[60vh]">
            <TutorlixEditor
                noteId={noteId}
                initialContent={formData.content} 
                onChange={(content) => setFormData({ ...formData, content })} 
            />
          </div>
        </div>
      </main>

      {/* Unified Configuration Dialog */}
      <Dialog
        open={isConfigOpen}
        onOpenChange={(open) => {
          // Prevent closing if it's a new note and title is missing
          if (!open && (!formData.title || !noteId)) {
            if (formData.title) {
              return;
            }
          }
          setIsConfigOpen(open);
        }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{noteId ? "Edit Details" : "New Note"}</DialogTitle>
            <DialogDescription>Configure the metadata and access settings for this note.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Core Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Title</Label>
                <Input
                  placeholder="e.g. Introduction to Quantum Physics"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Description</Label>
                <Textarea
                  placeholder="Brief summary of contents..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            <div className="h-px bg-border/50" />
            
            {/* Admin Creator Select */}
            {isAdmin && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Creator (Author)</Label>
                  <Select value={formData.creator} onValueChange={(v) => setFormData({ ...formData, creator: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher/admin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {creators.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                           {user.first_name} {user.last_name} ({user.email}) - {user.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            )}

            {/* Classification */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Classification</Label>
                <Select value={formData.note_type} onValueChange={(v) => setFormData({ ...formData, note_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Note</SelectItem>
                    <SelectItem value="course_specific">Course Specific</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {formData.note_type === "individual"
                    ? "Standalone content sold or accessed separately."
                    : "Content attached to a specific course curriculum."}
                </p>
              </div>

              {formData.note_type === "course_specific" ? (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Linked Product</Label>
                  <Select value={formData.product} onValueChange={(v) => setFormData({ ...formData, product: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          <div className="flex flex-col items-start text-left">
                            <span>{p.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Access Level</Label>
                  <Select value={formData.privacy} onValueChange={(v) => setFormData({ ...formData, privacy: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public (Free for all)</SelectItem>
                      <SelectItem value="logged_in">Logged In Users (Free)</SelectItem>
                      <SelectItem value="purchaseable">Paid Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Pricing Section (Only for Paid Individual Notes) */}
            {formData.note_type === "individual" && formData.privacy === "purchaseable" && (
              <div className="bg-muted/30 p-4 rounded-lg border space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
                    <Tag className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-bold">Pricing Configuration</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Base Price (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Discounted Price (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.discounted_price}
                      onChange={(e) => setFormData({ ...formData, discounted_price: e.target.value })}
                    />
                  </div>
                </div>
                {/* <div className="space-y-2">
                  <Label className="text-xs">Access Duration (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0 for Lifetime Access"
                    value={formData.access_duration_days}
                    onChange={(e) => setFormData({ ...formData, access_duration_days: e.target.value })}
                  />
                </div> */}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {!noteId && (
              <Button variant="ghost" onClick={() => router.push(basePath)}>
                Cancel Creation
              </Button>
            )}
            <Button
              onClick={(e) => {
                // Close dialog first, then submit
                if (formData.title) {
                  setIsConfigOpen(false);
                  handleSubmit(e);
                } else {
                  toast.error("Title is required");
                }
              }}
              disabled={!formData.title || isSubmitting}
              className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {noteId ? "Update Details" : "Start Writing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
