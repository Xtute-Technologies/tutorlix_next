import React, { useMemo } from 'react';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Calendar, IndianRupee } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import UserHoverCard from '@/components/UserHoverCard';

export default function SharedExpenseList({ 
  data, 
  loading, 
  userRole, 
  onEdit, 
  onDelete,
  entityType = 'seller' // 'seller' or 'teacher'
}) {
  const isAdmin = userRole === 'admin';
  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  const nameKey = `${entityType}_name`;

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
        accessorKey: nameKey,
        header: entityLabel,
        cell: ({ row }) => {
          const detailsKey = `${entityType}_details`;
          const details = row.original[detailsKey];
          const name = row.original[nameKey];
          const image = details?.profile_image;

          // Merge details with name if details is missing full_name but we have name from row
          const userObj = details ? { ...details, full_name: name } : { full_name: name };

          return (
            <UserHoverCard user={userObj} currentUserRole={userRole}>
                <div className="flex items-center gap-2">
                {image ? (
                    <img 
                    src={image} 
                    alt={name || entityLabel} 
                    className="h-8 w-8 rounded-full object-cover border border-gray-200" 
                    />
                ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                    {name?.charAt(0) || entityType.charAt(0).toUpperCase()}
                    </div>
                )}
                <span className="font-medium hover:underline decoration-dotted underline-offset-4">{name}</span>
                </div>
            </UserHoverCard>
          );
        },
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

    if (isAdmin) {
      cols.push({
        accessorKey: 'created_by_name',
        header: 'Logged By',
        cell: ({ row }) => {
            const details = row.original.created_by_details;
            const name = row.original.created_by_name || 'System';
            const userObj = details ? { ...details, full_name: name, role: 'admin' } : { full_name: name, role: 'system' };
            
            return (
                <UserHoverCard user={userObj} currentUserRole={userRole}>
                    <Badge variant="outline" className="text-xs text-gray-500 font-normal cursor-pointer hover:bg-gray-100">
                        {name}
                    </Badge>
                </UserHoverCard>
            );
        },
      });
    }

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
  }, [isAdmin, onEdit, onDelete, entityType, entityLabel, nameKey]);

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      searchKey={nameKey}
      searchPlaceholder={`Search by ${entityLabel}...`}
    />
  );
}
