'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import DataTable from '@/components/DataTable';
import { productLeadAPI } from '@/lib/lmsService'; 
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Pencil, Search } from 'lucide-react';
import { authService } from '@/lib/authService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge'; 

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
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounceValue(searchQuery, 500);
    
    // Edit Dialog State
    const [editingLead, setEditingLead] = useState(null);
    const [editForm, setEditForm] = useState({ status: '', remarks: '', assigned_to: '' });

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
            if (activeTab === 'product') params.source = 'Course Page';
            if (activeTab === 'general') params.source = 'Home Page';
             
            const data = await productLeadAPI.getAll(params);
            
            // Handle if data is paginated { count, results } or just array
            const results = Array.isArray(data) ? data : (data.results || []);
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
             const response = await authService.getAllUsers({ role: 'admin' });
             const admins = response.results || response;
             
             // Optionally fetch sellers too if needed, but keeping it simple
             setStaff(admins);
        } catch (e) { console.error(e); }
    };

    const openEditDialog = (lead) => {
        setEditingLead(lead);
        setEditForm({
            status: lead.status || 'new',
            remarks: lead.remarks || '',
            assigned_to: lead.assigned_to ? String(lead.assigned_to) : 'unassigned'
        });
    };

    const saveEdit = async () => {
        if (!editingLead) return;
        try {
            const payload = { ...editForm };
            if (payload.assigned_to === 'unassigned') payload.assigned_to = null;
            
            const updated = await productLeadAPI.update(editingLead.id, payload);
            setLeads(prev => prev.map(l => l.id === editingLead.id ? updated : l));
            setEditingLead(null);
        } catch(e) {
            console.error("Failed to update lead", e);
        }
    };

    const columns = useMemo(() => [
        {
            accessorKey: 'created_at',
            header: 'Date',
            cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString()
        },
        {
            accessorKey: 'source',
            header: 'Type',
            cell: ({ row }) => (
                row.original.source === 'Home Page' ? (
                     <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">General</Badge>
                ) : (
                     <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100">Product</Badge>
                )
            )
        },
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.name}</span>
                    <span className="text-xs text-muted-foreground">{row.original.product_name || "General Inquiry"}</span>
                </div>
            )
        },
        // Combined Contact Info to save space
        {
            accessorKey: 'contact',
            header: 'Contact',
            cell: ({ row }) => (
                <div className="flex flex-col text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {row.original.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {row.original.phone}</span>
                    {row.original.state && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {row.original.state}</span>}
                </div>
            )
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const statusColors = {
                    new: 'bg-blue-100 text-blue-800 border-blue-200',
                    contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
                    converted: 'bg-green-100 text-green-800 border-green-200',
                    lost: 'bg-red-100 text-red-800 border-red-200'
                };
                return (
                    <Badge variant="outline" className={`${statusColors[row.original.status] || ''} capitalize`}>
                        {row.original.status.replace('_', ' ')}
                    </Badge>
                );
            }
        },
        {
            accessorKey: 'assigned_to_name',
            header: 'Assigned To',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.assigned_to_name || "Unassigned"}
                </span>
            )
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openEditDialog(row.original)}
                >
                    <Pencil className="h-4 w-4 text-slate-500" />
                </Button>
            )
        }
    ], [staff]);

    return (
        <div className="space-y-6">

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Product Leads</h1>
                <Button onClick={fetchLeads} variant="outline" size="sm">Refresh</Button>
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
                            <Select 
                                value={editForm.status} 
                                onValueChange={(val) => setEditForm({...editForm, status: val})}
                            >
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
                             <Select 
                                value={editForm.assigned_to} 
                                onValueChange={(val) => setEditForm({...editForm, assigned_to: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {staff.map(s => (
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
                                onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                                placeholder="Add notes about this lead..."
                                rows={5}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingLead(null)}>Cancel</Button>
                        <Button onClick={saveEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}