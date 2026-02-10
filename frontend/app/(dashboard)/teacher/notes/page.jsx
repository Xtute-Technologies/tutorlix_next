"use client";
import { useState, useEffect, useMemo } from "react";
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
import { Plus, ListFilter, FilterX, BookOpen, ScrollText } from "lucide-react";
import { toast } from "sonner";

export default function TeacherNotesPage() {
  const router = useRouter();

  // State
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState(null);
  const [products, setProducts] = useState([]);

  // Filters
  const [tabFilter, setTabFilter] = useState("all"); // all, individual, course_specific
  const [statusFilter, setStatusFilter] = useState("all"); // all, published, draft
  const [productFilter, setProductFilter] = useState("all");

  useEffect(() => {
    // Load instructor products for filter
    const loadProducts = async () => {
      try {
        const data = await productAPI.getAll({ my_products: "true" });
        setProducts(Array.isArray(data) ? data : (data.results || []));
      } catch (err) {
        console.error("Failed to load products for filter", err);
      }
    };
    loadProducts();
  }, []);




  // Memoized adapter
  const notesTableAdapter = useMemo(() => {
    return createTableAdapter(
      async (params) => {
        const { statusFilter, tabFilter, productFilter, ...rest } = params;
        const apiParams = { ...rest };

        // --- Status Logic ---
        if (statusFilter === "draft") {
          apiParams.is_draft = true;
        } else if (statusFilter === "published") {
          apiParams.is_draft = false;
        }
        // If "all", we don't send is_draft so backend returns both

        // --- Tab Logic ---
        if (tabFilter && tabFilter !== "all") {
          apiParams.note_type = tabFilter;
        }

        // --- Product Logic ---
        if (productFilter && productFilter !== "all") {
          apiParams.product = productFilter;
        }

        return noteAPI.getMyNotes(apiParams);
      },
      {
        sortMap: {
          product_name: "product__name",
        },
      },
    );
  }, []);

  // Memoized dependencies
  const tableDependencies = useMemo(
    () => ({
      tabFilter,
      statusFilter,
      productFilter,
      refreshKey,
    }),
    [tabFilter, statusFilter, productFilter, refreshKey],
  );

  const handleViewDetail = (id) => router.push(`/teacher/notes/${id}/preview`);
  const handleEdit = (note) => router.push(`/teacher/notes/${note.id}`);
  const handleCreate = () => router.push("/teacher/notes/new");

  const handleDeleteTrigger = (id) => {
      setDeleteNoteId(id);
      setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteNoteId) return;
    try {
      await noteAPI.delete(deleteNoteId);
      toast.success("Note deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeleteNoteId(null);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const hasActiveFilters = statusFilter !== "all" || productFilter !== "all";

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">My Notes</h1>
          <p className="text-muted-foreground mt-1">Create and manage your educational notes</p>
        </div>
        <Button onClick={handleCreate} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Create Note
        </Button>
      </div>

      {/* Main Content Area with Tabs */}
      <div className="space-y-4">
        <Tabs defaultValue="all" value={tabFilter} onValueChange={setTabFilter} className="w-full">
          
          {/* Controls Bar */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="all" className="gap-2"><BookOpen className="h-4 w-4" />All Notes</TabsTrigger>
                <TabsTrigger value="individual">Individual</TabsTrigger>
                <TabsTrigger value="course_specific">Course Related</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3 w-full sm:w-auto animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* Status Filter */}
                  <div className="w-[150px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9">
                        <div className="flex items-center gap-2">
                          <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue placeholder="Status" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Drafts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Filter */}
                  <div className="w-[180px]">
                    <Select value={productFilter} onValueChange={setProductFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Products" />
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
                  </div>
                </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-md border text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <FilterX className="h-3.5 w-3.5" />
                  Filters Active:
                </span>
                
                {statusFilter !== "all" && (
                   <Badge variant="secondary" className="bg-background border">
                     Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                   </Badge>
                )}

                {productFilter !== "all" && (
                   <Badge variant="secondary" className="bg-background border">
                     Product: {products.find(p => p.id.toString() === productFilter)?.name}
                   </Badge>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setStatusFilter("all"); setProductFilter("all"); }} 
                  className="ml-auto h-6 text-xs hover:bg-transparent text-primary hover:text-primary/80"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="all" className="mt-0">
             <TeacherNotesList
                adapter={notesTableAdapter}
                dependencies={tableDependencies}
                userRole="teacher"
                onPreview={handleViewDetail}
                onEdit={handleEdit}
                onDelete={handleDeleteTrigger}
                defaultPageSize={20}
            />
          </TabsContent>

          <TabsContent value="individual" className="mt-0">
             <TeacherNotesList
                adapter={notesTableAdapter}
                dependencies={tableDependencies}
                userRole="teacher"
                onPreview={handleViewDetail}
                onEdit={handleEdit}
                onDelete={handleDeleteTrigger}
                defaultPageSize={20}
            />
          </TabsContent>

          <TabsContent value="course_specific" className="mt-0">
             <TeacherNotesList
                adapter={notesTableAdapter}
                dependencies={tableDependencies}
                userRole="teacher"
                onPreview={handleViewDetail}
                onEdit={handleEdit}
                onDelete={handleDeleteTrigger}
                defaultPageSize={20}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this note. Students with access will lose it immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete Note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}