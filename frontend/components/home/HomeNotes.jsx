'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import NoteCard from '@/components/notes/NoteCard';
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeNotes({ notes, loading }) {
  // If loading, show skeletons.
  // If not loading and no notes, show nothing (or could show empty state, but user said "if no notes then show something correctly" - maybe just hide section or show message?)
  // User said: "if no notes then show something correcltym on home page right"
  // Let's hide the section if empty to keep home page clean, OR show "No notes found for your profile".
  // Given "show something correctly", I'll opt to just hide it if truly empty, or show a friendly message if it's unexpected.
  // Actually, let's show a placeholder if there are NO notes at all, so user knows feature exists but maybe not for them.
  
  if (!loading && (!notes || notes.length === 0)) {
    return null; 
  }

  return (
    <section className="py-24 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center md:text-left md:flex md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Latest Study Notes</h2>
            <p className="text-slate-500 mt-2 text-lg">Top rated study materials curated for your profile</p>
          </div>
          <Link href="/notes" className="hidden md:block">
            <Button variant="ghost" className="text-slate-600 hover:text-primary hover:bg-transparent p-0 flex items-center gap-2 group">
              View All Notes <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                 <div key={i} className="flex flex-col space-y-4">
                   <Skeleton className="h-[280px] w-full rounded-xl" />
                   <div className="space-y-2 px-2">
                     <Skeleton className="h-4 w-3/4" />
                     <Skeleton className="h-3 w-1/2" />
                   </div>
                 </div>
              ))}
            </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {notes.map((note) => (
              <div key={note.id} className="h-full">
                <NoteCard note={note} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center md:hidden">
          <Link href="/notes">
            <Button variant="outline" size="lg" className="w-full rounded-xl">
              Browse All Notes
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
