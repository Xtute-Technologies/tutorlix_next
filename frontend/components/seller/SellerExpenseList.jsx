import React, { useMemo } from 'react';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, DollarSign, User, Calendar, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SellerExpenseList({ 
  data, 
  loading, 
  userRole, 
  onEdit, 
  onDelete 
}) {
  const isAdmin = userRole === 'admin';

  const columns = useMemo(() => {
    const cols = [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            {new Date(row.original.date).toLocaleDateString()}
          </div>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 font-bold text-green-700">
            <IndianRupee className="h-4 w-4" />
            {parseFloat(row.original.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        ),
      },
      {
        accessorKey: 'seller_name',
        header: 'Seller',
        // If logged in as seller, this column is redundant but good for confirmation
        // If admin, this is crucial
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
              {row.original.seller_name?.charAt(0) || 'S'}
            </div>
            <span className="font-medium">{row.original.seller_name}</span>
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
             {row.original.description || '-'}
          </span>
        ),
      },
    ];

    // Only Admin should see who created the record (Audit trail)
    if (isAdmin) {
      cols.push({
        accessorKey: 'created_by_name',
        header: 'Logged By',
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs text-gray-500 font-normal">
            {row.original.created_by_name || 'System'}
          </Badge>
        ),
      });
    }

    // Only Admin can Edit/Delete
    if (isAdmin) {
      cols.push({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(row.original)}
            >
              <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row.original.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      });
    }

    return cols;
  }, [isAdmin, onEdit, onDelete]);

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      searchKey="seller_name" // Search by seller name
      searchPlaceholder="Search by seller..."
    />
  );
}