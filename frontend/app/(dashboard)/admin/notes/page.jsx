"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TeacherNotesList from "@/components/TeacherNotesList";
import { createTableAdapter } from "@/lib/createTableAdapter";
import { noteAPI } from "@/lib/notesService";
import { productAPI } from "@/lib/lmsService";
import { Plus, FilterX, Users, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function AdminNotesPage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState(null);
  const [products, setProducts] = useState([]);

  // Filters matching Teacher Page
  const [tabFilter, setTabFilter] = useState("all"); // all, individual, course_specific
  const [statusFilter, setStatusFilter] = useState("all"); // all, published, draft
  const [productFilter, setProductFilter] = useState("all");

  useEffect(() => {
    // Load ALL products for admin filter
    const loadProducts = async () => {
      try {
        const data = await productAPI.getAll({ page_size: 100 });
        setProducts(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error("Failed to load products for filter", err);
      }
    };
    loadProducts();
  }, []);

  const handlePreview = (id) => router.push(`/admin/notes/${id}/preview`);
  const handleEdit = (note) => router.push(`/admin/notes/${note.id}`);
  const handleDeleteTrigger = (id) => {
    setDeleteNoteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteNoteId) return;
    try {
      await noteAPI.delete(deleteNoteId);
      toast.success("Note deleted successfully");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      toast.error("Failed to delete note");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteNoteId(null);
    }
  };

  // Create adapter for DataTableServer with Filters
  const dataAdapter = useMemo(() => {
    return createTableAdapter(
      async (params) => {
        const { statusFilter, tabFilter, productFilter, ...rest } = params;
        const apiParams = { ...rest };

        // Status
        if (statusFilter === "draft") apiParams.is_draft = true;
        else if (statusFilter === "published") apiParams.is_draft = false;

        // Tab
        if (tabFilter && tabFilter !== "all") apiParams.note_type = tabFilter;

        // Product
        if (productFilter && productFilter !== "all") apiParams.product = productFilter;

        // Use getAll for Admin
        const response = await noteAPI.getAll(apiParams);

        // If direct array
        if (Array.isArray(response)) return { results: response, count: response.length };

        // If paginated
        return response;
      },
      {
        sortMap: {
          creator: "creator__first_name",
          product_name: "product__name",
        },
      },
    );
  }, []);

  const tableDependencies = useMemo(
    () => ({
      tabFilter,
      statusFilter,
      productFilter,
      refreshKey,
    }),
    [tabFilter, statusFilter, productFilter, refreshKey],
  );

  const hasActiveFilters = statusFilter !== "all" || productFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notes Management</h2>
          <p className="text-muted-foreground">Manage all notes across the platform.</p>
        </div>
        <Button onClick={() => router.push("/admin/notes/new")}>
          <Plus className="mr-2 h-4 w-4" /> Create Note
        </Button>
      </div>

      {/* Filtering Layout similar to Teacher Page */}
      <div className="flex flex-col space-y-4">
        <Tabs defaultValue="all" value={tabFilter} onValueChange={setTabFilter} className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                <BookOpen className="h-4 w-4" />
                All Notes
              </TabsTrigger>
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="course_specific">Course Specific</TabsTrigger>

            </TabsList>

            {tabFilter !== "enrollments" && (
              <div className="flex items-center gap-2 w-full sm:w-auto animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Product Filter */}
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Drafts</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setStatusFilter("all");
                      setProductFilter("all");
                    }}
                    title="Clear filters">
                    <FilterX className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <TabsContent value="all" className="mt-0 pt-4">
            {/* Content rendered below */}
          </TabsContent>
          <TabsContent value="individual" className="mt-0 pt-4" />
          <TabsContent value="course_specific" className="mt-0 pt-4" />
        </Tabs>

        {/* Table Area */}

        <TeacherNotesList
          adapter={dataAdapter}
          dependencies={tableDependencies}
          userRole="admin"
          onPreview={handlePreview}
          onEdit={handleEdit}
          onDelete={handleDeleteTrigger}
        />
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the note.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
