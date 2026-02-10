"use client";

import React, { useEffect, useState } from "react";
import NoteTransactionsList from "@/components/notes/NoteTransactionsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { noteAPI } from "@/lib/notesService";
import { IndianRupee, TrendingUp, ShoppingBag, FileText, Loader2 } from "lucide-react";

export default function TeacherNoteTransactionsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await noteAPI.getAnalytics();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="flex-1 space-y-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Note Sales</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <div className="text-2xl font-bold text-green-600">
                    ₹{stats?.total_revenue?.toLocaleString() || 0}
                </div>
            )}
            <p className="text-xs text-muted-foreground">
              Total earnings from note sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <div className="text-2xl font-bold">{stats?.total_purchases || 0}</div>
             )}
            <p className="text-xs text-muted-foreground">
              Number of notes sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Notes</CardTitle>
             <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <div className="text-2xl font-bold">{stats?.published_notes || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Active notes available for sale
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">

               <NoteTransactionsList userRole="teacher" />

      </div>
    </div>
  );
}
