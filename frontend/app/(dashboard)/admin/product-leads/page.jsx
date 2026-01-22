'use client';

import { useEffect, useState, useMemo } from 'react';
import DataTable from '@/components/DataTable';
import { productLeadAPI } from '@/lib/lmsService'; 
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin } from 'lucide-react';
import { authService } from '@/lib/authService';

export default function ProductLeadsPage() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staff, setStaff] = useState([]); 

    useEffect(() => {
        fetchLeads();
        fetchStaff();
    }, []);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const data = await productLeadAPI.getAll();
            setLeads(data);
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

    const handleStatusChange = async (leadId, newStatus) => {
        try {
            await productLeadAPI.update(leadId, { status: newStatus });
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
        } catch(e) { console.error(e); }
    };

    const handleAssignChange = async (leadId, userId) => {
        try {
            const updated = await productLeadAPI.assign(leadId, userId);
            setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
        } catch(e) { console.error(e); }
    };

    const columns = useMemo(() => [
        {
            accessorKey: 'created_at',
            header: 'Date',
            cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString()
        },
        {
            accessorKey: 'name',
            header: 'Lead Name',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {row.original.state}</span>
                </div>
            )
        },
        {
            accessorKey: 'contact',
            header: 'Contact',
            cell: ({ row }) => (
                <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /> {row.original.email}</div>
                    <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /> {row.original.phone}</div>
                </div>
            )
        },
        {
            accessorKey: 'product_name',
            header: 'Interest'
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const statusColors = {
                    new: 'bg-blue-100 text-blue-800',
                    contacted: 'bg-yellow-100 text-yellow-800',
                    in_progress: 'bg-purple-100 text-purple-800',
                    converted: 'bg-green-100 text-green-800',
                    lost: 'bg-red-100 text-red-800'
                };
                return (
                    <Select defaultValue={row.original.status} onValueChange={(val) => handleStatusChange(row.original.id, val)}>
                        <SelectTrigger className={`w-[130px] h-8 ${statusColors[row.original.status] || ''} border-0`}>
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
                );
            }
        },
        {
            accessorKey: 'assigned_to',
            header: 'Assigned To',
            cell: ({ row }) => {
                return (
                     <Select 
                        onValueChange={(val) => handleAssignChange(row.original.id, val)} 
                        defaultValue={row.original.assigned_to ? String(row.original.assigned_to) : undefined}
                     >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                             <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                            {staff.map(s => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                    {s.first_name} {s.last_name || s.username}
                                </SelectItem>
                            ))}
                        </SelectContent>
                     </Select>
                );
            }
        }
    ], [staff]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Product Leads</h1>
                <Button onClick={fetchLeads} variant="outline" size="sm">Refresh</Button>
            </div>
            
            <DataTable 
                columns={columns} 
                data={leads} 
                loading={loading}
                searchKey="name" 
                searchPlaceholder="Search leads..."
            />
        </div>
    );
}