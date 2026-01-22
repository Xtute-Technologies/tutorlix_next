"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * A purely server-side driven DataTable.
 * * @param {Object} props
 * @param {Function} props.fetchData - Async function: ({ pageIndex, pageSize, search, sorting }) => Promise<{ rows, pageCount, totalCount }>
 * @param {Array} props.columns - TanStack columns definition
 * @param {Object} props.dependencies - Extra external filters (like 'role') that should trigger a refetch
 */
export default function DataTableServer({
  columns,
  fetchData,
  dependencies = {}, 
  defaultPageSize = 20,
}) {
  // --- Table State ---
  const [data, setData] = useState([]);
  const [pageCount, setPageCount] = useState(-1);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // --- Controls State ---
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });
  const [sorting, setSorting] = useState([]); // [{ id: 'name', desc: true }]
  const [globalFilter, setGlobalFilter] = useState(""); // Search text

  // --- Debounced Search ---
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalFilter);
      setPagination((prev) => ({ ...prev, pageIndex: 0 })); // Reset to page 1 on search
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [globalFilter]);

  // --- Data Fetching Effect ---
  // This triggers whenever Pagination, Sorting, Search, or External Dependencies change
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
          ...dependencies // Spread external filters like 'role'
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
    manualFiltering: true, // Server handles filtering
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Top Bar: Search & Page Size */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Page Size Selector */}
        {/* <div className="w-[120px]">
          <Select
            value={`${pagination.pageSize}`}
            onValueChange={(val) => {
              table.setPageSize(Number(val));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize} Rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}
      </div>

      {/* Table Container */}
      <div className="rounded-md border overflow-hidden relative min-h-[300px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-gray-500 uppercase font-medium">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-3 whitespace-nowrap">
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? "cursor-pointer select-none flex items-center gap-2 hover:text-gray-900 group"
                              : ""
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {/* Sort Indicator */}
                          {header.column.getCanSort() && (
                            <span className="text-gray-400 group-hover:text-gray-600">
                              {{
                                asc: <ArrowUpDown className="h-3 w-3 text-blue-600 rotate-180" />,
                                desc: <ArrowUpDown className="h-3 w-3 text-blue-600" />,
                              }[header.column.getIsSorted()] ?? (
                                <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />
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
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                    {isLoading ? "Fetching data..." : "No records found matching your filters."}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
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
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all">
            <div className="bg-white p-3 rounded-full shadow-lg border">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <div className="text-sm text-gray-500">
          Page <span className="font-medium text-gray-900">{pagination.pageIndex + 1}</span> of{" "}
          <span className="font-medium text-gray-900">{table.getPageCount()}</span>
          <span className="mx-2 text-gray-300">|</span>
          <span className="font-medium text-gray-900">{totalRows}</span> Total Records
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
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