'use client';

import dynamic from 'next/dynamic';

// Import the editor component without SSR
const TutorlixEditor = dynamic(() => import('@/components/notes/TutorlixEditor'), { 
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-50 animate-pulse rounded-xl" />
});

export default function CreateNotePage() {
  return (
    <main className="max-w-7xl w-full mx-auto">
      {/* <h1 className="text-3xl font-bold mb-8">Create New Note</h1> */}
      <TutorlixEditor />
    </main>
  );
}