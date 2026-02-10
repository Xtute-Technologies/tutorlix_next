"use client";

import { useState, useEffect } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * A purely server-side driven DataTable using shadcn/ui variables.
 */
export default function DataTableServer({
  columns,
  fetchData,
  dependencies = {}, 
  defaultPageSize = 50,
}) {
  // --- Table State ---
  const [data, setData] = useState([]);
  const [pageCount, setPageCount] = useState(-1);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // --- Controls State ---
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });
  const [sorting, setSorting] = useState([]); 
  const [globalFilter, setGlobalFilter] = useState(""); 

  // --- Debounced Search ---
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalFilter);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [globalFilter]);

  // --- Data Fetching Effect ---
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const result = await fetchData({
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          search: debouncedSearch,
          sorting: sorting,
          ...dependencies 
        });

        if (isMounted) {
          setData(result.rows || []);
          setPageCount(result.pageCount || 0);
          setTotalRows(result.totalCount || 0);
        }
      } catch (error) {
        console.error("Table Fetch Error:", error);
        if (isMounted) setData([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [pagination.pageIndex, pagination.pageSize, sorting, debouncedSearch, dependencies, fetchData]);

  // --- Table Configuration ---
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination,
      sorting,
    },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Top Bar: Search & Page Size */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">Rows per page</p>
          <Select
            value={`${pagination.pageSize}`}
            onValueChange={(val) => {
              const newSize = Number(val);
              if (newSize !== pagination.pageSize) {
                setPagination(prev => ({ ...prev, pageSize: newSize, pageIndex: 0 }));
              }
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder={`${pagination.pageSize}`} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-md border border-border bg-card overflow-hidden relative min-h-[300px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            header.column.getCanSort() 
                              ? "cursor-pointer select-none flex items-center gap-2 hover:text-foreground transition-colors group" 
                              : ""
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="text-muted-foreground/50 group-hover:text-foreground">
                              {{
                                asc: <ArrowUpDown className="h-4 w-4 text-primary" />,
                                desc: <ArrowUpDown className="h-4 w-4 text-primary rotate-180" />,
                              }[header.column.getIsSorted()] ?? (
                                <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    {isLoading ? "Fetching data..." : "No records found matching your filters."}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/50 transition-colors data-[state=selected]:bg-muted">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all">
            <div className="bg-background p-3 rounded-full shadow-md border border-border">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-2">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">
            {pagination.pageIndex * pagination.pageSize + 1}
          </span> to <span className="font-medium text-foreground">
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows)}
          </span> of <span className="font-medium text-foreground">{totalRows}</span> records
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center justify-center text-sm font-medium mx-2">
             {pagination.pageIndex + 1} / {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}