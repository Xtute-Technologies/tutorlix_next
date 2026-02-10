"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { publicNoteAPI } from "@/lib/notesService";
import {
  BookOpen,
  Search,
  Filter,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import NoteCard from "@/components/notes/NoteCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function PublicNotesPage() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 12,
    count: 0,
  });

  // Load notes when page or type changes
  useEffect(() => {
    loadNotes();
  }, [pagination.page, typeFilter]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        loadNotes();
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.page_size,
        search: searchQuery || undefined,
        privacy: typeFilter !== "all" ? typeFilter : undefined,
      };

      const response = await publicNoteAPI.browse(params);
      setNotes(response.results || []);
      setPagination((prev) => ({ ...prev, count: response.count || 0 }));
    } catch (error) {
      console.error("Error loading notes:", error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(pagination.count / pagination.page_size);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* --- Modern Hero Section --- */}
      <div className="relative bg-primary py-20 overflow-hidden border-b border-black/5">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 border-4 border-black rounded-full animate-pulse" />
            <div className="absolute bottom-[-50px] right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-7xl px-4 relative z-10">
          <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Badge className="bg-black text-white hover:bg-black/90 px-4 py-1 rounded-full uppercase tracking-tighter text-[10px] font-bold">
               <Sparkles className="h-3 w-3 mr-2 inline" /> Premium Educational Content
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
              STUDY <br /> SMARTER.
            </h1>
            <p className="text-xl text-white/70 font-medium max-w-xl leading-relaxed">
              Explore high-quality lecture notes, study guides, and resources curated by expert educators.
            </p>
            
            {/* Search Input Container */}
            <div className="relative max-w-xl group shadow-2xl rounded-2xl overflow-hidden mt-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-black/40 group-focus-within:text-black transition-colors" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, subject or teacher..."
                className="pl-12 h-16 text-lg border-none bg-white text-black placeholder:text-black/30 focus-visible:ring-0 rounded-none shadow-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-black/40" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-12">
        {/* --- Controls & Filter Bar --- */}
        {/* <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-6 w-full md:w-auto">
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center border border-border">
                    <Filter className="h-4 w-4 text-foreground" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px] h-10 font-bold border-none bg-muted hover:bg-muted/80 transition-colors rounded-xl shadow-none">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border">
                    <SelectItem value="all">All Content</SelectItem>
                    <SelectItem value="public">Free Resources</SelectItem>
                    <SelectItem value="purchaseable">Premium Notes</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
             Found <span className="text-foreground">{pagination.count}</span> Study Modules
          </div>
        </div> */}

        {/* --- Content Grid --- */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
               <div key={i} className="flex flex-col space-y-4">
                 <Skeleton className="h-[280px] w-full rounded-3xl" />
                 <div className="space-y-2 px-2">
                   <Skeleton className="h-5 w-3/4 rounded-full" />
                   <Skeleton className="h-4 w-1/2 rounded-full" />
                 </div>
               </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 bg-muted/20 rounded-[3rem] animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-background w-20 h-20 rounded-3xl border border-border flex items-center justify-center mx-auto mb-6 shadow-sm">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-2 uppercase">Nothing Found</h3>
            <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
              We couldn&apos;t find any notes matching your current criteria.
            </p>
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl px-8 font-bold border-border hover:bg-primary hover:border-primary transition-all"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
              }}
            >
              Reset All Filters
            </Button>
          </Card>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
              {notes.map((note, index) => (
                <div 
                    key={note.id} 
                    className="h-full transform transition-all duration-300 hover:-translate-y-2"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                  <NoteCard note={note} />
                </div>
              ))}
            </div>

            {/* --- Pagination --- */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-8 border-t border-border">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-12 w-12 border-border"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center bg-muted px-6 h-12 rounded-xl border border-border">
                   <span className="text-sm font-black uppercase tracking-widest">
                     Page {pagination.page} / {totalPages}
                   </span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-12 w-12 border-border"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === totalPages}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
