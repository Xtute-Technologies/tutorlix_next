"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import DataTable from "@/components/DataTable";
import { productLeadAPI } from "@/lib/lmsService";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Pencil, Search } from "lucide-react";
import { authService } from "@/lib/authService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Simple debounce helper since I can't find a file for it easily and don't want to break things
function useDebounceValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function ProductLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounceValue(searchQuery, 500);

  // Edit Dialog State
  const [editingLead, setEditingLead] = useState(null);
  const [editForm, setEditForm] = useState({ status: "", remarks: "", assigned_to: "" });

  useEffect(() => {
    fetchLeads();
  }, [debouncedSearch, activeTab]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeTab === "product") params.source = "Course Page";
      if (activeTab === "general") params.source = "Home Page";

      const data = await productLeadAPI.getAll(params);

      // Handle if data is paginated { count, results } or just array
      const results = Array.isArray(data) ? data : data.results || [];
      setLeads(results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      // Fetch Admins and Sellers ideally. For now fetching all admins.
      const response = await authService.getAllUsers({ role: "admin" });
      const admins = response.results || response;

      // Optionally fetch sellers too if needed, but keeping it simple
      setStaff(admins);
    } catch (e) {
      console.error(e);
    }
  };

  const openEditDialog = (lead) => {
    setEditingLead(lead);
    setEditForm({
      status: lead.status || "new",
      remarks: lead.remarks || "",
      assigned_to: lead.assigned_to ? String(lead.assigned_to) : "unassigned",
    });
  };

  const saveEdit = async () => {
    if (!editingLead) return;
    try {
      const payload = { ...editForm };
      if (payload.assigned_to === "unassigned") payload.assigned_to = null;

      const updated = await productLeadAPI.update(editingLead.id, payload);
      setLeads((prev) => prev.map((l) => (l.id === editingLead.id ? updated : l)));
      setEditingLead(null);
    } catch (e) {
      console.error("Failed to update lead", e);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-slate-500">
            {new Date(row.original.created_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Lead Details",
        cell: ({ row }) => (
          <div className="flex flex-col min-w-[150px]">
            <span className="font-semibold text-slate-900">{row.original.name}</span>
            <div className="flex items-center gap-2 mt-0.5">
              {row.original.source === "Home Page" ? (
                <Badge
                  variant="outline"
                  className="h-4 px-1 text-[10px] bg-slate-50 text-slate-500 border-slate-200 uppercase tracking-tighter">
                  General
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="h-4 px-1 text-[10px] bg-blue-50 text-blue-600 border-blue-100 uppercase tracking-tighter">
                  Product
                </Badge>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "interest_area",
        header: "Interested In",
        cell: ({ row }) => {
          const interest = row.original.interest_area;
          const product = row.original.product_name;

          return (
            <div className="max-w-[200px]">
              {interest ? (
                <Badge className="bg-indigo-600/10 text-indigo-700 border-indigo-200 hover:bg-indigo-600/10 font-medium text-xs">
                  {interest}
                </Badge>
              ) : product ? (
                <span className="text-sm font-medium text-slate-700 leading-tight block">{product}</span>
              ) : (
                <span className="text-slate-400 text-xs italic">No specific interest</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "contact",
        header: "Contact Info",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 text-[13px]">
            <a href={`mailto:${row.original.email}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
              <Mail className="h-3.5 w-3.5" />
              {row.original.email}
            </a>
            <div className="flex items-center gap-3 text-slate-500">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {row.original.phone}
              </span>
              {row.original.state && (
                <span className="flex items-center gap-1 border-l pl-3">
                  <MapPin className="h-3 w-3" /> {row.original.state}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const statusColors = {
            new: "bg-emerald-50 text-emerald-700 border-emerald-200",
            contacted: "bg-amber-50 text-amber-700 border-amber-200",
            in_progress: "bg-blue-50 text-blue-700 border-blue-200",
            converted: "bg-indigo-50 text-indigo-700 border-indigo-200",
            lost: "bg-rose-50 text-rose-700 border-rose-200",
          };
          return (
            <Badge
              variant="outline"
              className={`${statusColors[row.original.status] || "bg-slate-50 text-slate-600"} capitalize font-medium py-0.5`}>
              {row.original.status.replace("_", " ")}
            </Badge>
          );
        },
      },
      {
        accessorKey: "assigned_to_name",
        header: "Assigned To",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {/* <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200">
              {row.original.assigned_to_name ? row.original.assigned_to_name.charAt(0) : "?"}
            </div> */}
            <span className="text-sm font-medium text-slate-600">
              {row.original.assigned_to_name || <span className="text-slate-400 font-normal italic">Unassigned</span>}
            </span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              onClick={() => openEditDialog(row.original)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [staff, openEditDialog],
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Product Leads</h1>
        <Button onClick={fetchLeads} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Leads</TabsTrigger>
            <TabsTrigger value="product">Product Leads</TabsTrigger>
            <TabsTrigger value="general">General Inquiries</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search leads..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        hideSearch={true} // Using server-side search instead
      />

      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead: {editingLead?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(val) => setEditForm({ ...editForm, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={editForm.assigned_to} onValueChange={(val) => setEditForm({ ...editForm, assigned_to: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.first_name} {s.last_name || s.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                placeholder="Add notes about this lead..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLead(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
