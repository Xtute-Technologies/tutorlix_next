"use client";

import React, { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import NoteCard from "@/components/notes/NoteCard";
import { Skeleton } from "@/components/ui/skeleton";

function NoteGrid({ mode }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const params = {
          page,
          page_size: 12,
          view_mode: mode,
          search: debouncedSearch,
        };
        
        const response = await axios.get("/api/notes/", { params });
        
        if (page === 1) {
          setNotes(response.data.results);
        } else {
          setNotes((prev) => [...prev, ...response.data.results]);
        }
        
        // Check if there are more
        setHasMore(!!response.data.next);
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [page, mode, debouncedSearch]);

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  if (loading && page === 1) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
        {[...Array(8)].map((_, i) => (
           <div key={i} className="flex flex-col space-y-3">
             <Skeleton className="h-[250px] w-full rounded-xl" />
             <div className="space-y-2">
               <Skeleton className="h-4 w-[250px]" />
               <Skeleton className="h-4 w-[200px]" />
             </div>
           </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
       {/* Search Bar */}
       <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
             placeholder="Search notes..." 
             className="pl-8" 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
          />
       </div>
       
       {notes.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No notes found</p>
            <p className="text-sm">
                {mode === 'mine' ? "You haven't enrolled in any notes yet." : "No notes available to explore."}
            </p>
          </div>
       )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-4 pb-8">
          <Button 
            variant="outline" 
            onClick={handleLoadMore} 
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

export default function StudentNotesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Notes</h2>
      </div>

      <Tabs defaultValue="mine" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mine">My Notes</TabsTrigger>
          <TabsTrigger value="explore">Explore Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="space-y-4">
           <NoteGrid mode="mine" />
        </TabsContent>
        <TabsContent value="explore" className="space-y-4">
           <NoteGrid mode="explore" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
