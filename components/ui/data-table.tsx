"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import React from "react";

interface Column {
  key: string;
  header: string | React.ReactNode; // Allow both string and React nodes
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading: boolean;
  error: string | null;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  actions?: (row: any) => React.ReactNode;
  expandableContent?: (row: any) => React.ReactNode;
  expandedRows?: Set<string>;
  onExpandChange?: (rowId: string, isExpanded: boolean) => void;
  className?: string;
  keyField?: string;
}

export function DataTable({
  columns,
  data,
  loading,
  error,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  pagination,
  onPageChange,
  emptyMessage = "No data found.",
  actions,
  expandableContent,
  expandedRows = new Set(),
  onExpandChange,
  className = "",
  keyField = "id",
}: DataTableProps) {
  const renderCell = (row: any, column: Column) => {
    const value = row[column.key];
    return column.render ? column.render(value, row) : value;
  };

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  // Safe header rendering function
  const renderHeader = (header: string | React.ReactNode) => {
    if (typeof header === 'function') {
      console.warn('Function passed as header. Header should be a string or React node.');
      return 'Header';
    }
    return header;
  };

  return (
    <div className={`bg-gray-900 text-white p-6 min-h-screen ${className}`}>
      {error && (
        <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800 mb-4">
          {error}
        </div>
      )}

      {searchPlaceholder && onSearchChange && (
        <div className="mb-4">
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-md bg-gray-800 text-white border-gray-600"
          />
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-center text-gray-400">{emptyMessage}</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-800 hover:bg-gray-800">
                <TableHead className="text-gray-200">#</TableHead>
                {columns.map((column) => (
                  <TableHead 
                    key={column.key} 
                    className={`text-gray-200 ${column.className || ""}`}
                  >
                    {renderHeader(column.header)}
                  </TableHead>
                ))}
                {actions && <TableHead className="text-gray-200">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => {
                const isExpanded = expandedRows.has(row._id);
                const rowKey = row[keyField] || row._id || row.id || index;
                
                return (
                  <React.Fragment key={rowKey}>
                    <TableRow className="border-gray-700 hover:bg-gray-800">
                      <TableCell>{index + 1}</TableCell>
                      {columns.map((column) => (
                        <TableCell key={`${rowKey}-${column.key}`} className={column.className}>
                          {renderCell(row, column)}
                        </TableCell>
                      ))}
                      {actions && <TableCell>{actions(row)}</TableCell>}
                    </TableRow>
                    {isExpanded && expandableContent && (
                      <TableRow className="bg-gray-750">
                        <TableCell colSpan={columns.length + (actions ? 2 : 1)} className="p-4">
                          {expandableContent(row)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>

          {pagination && onPageChange && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => pagination.hasPrev && handlePageChange(pagination.currentPage - 1)}
                      className={pagination.hasPrev ? "cursor-pointer" : "pointer-events-none opacity-50"}
                    />
                  </PaginationItem>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={page === pagination.currentPage}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => pagination.hasNext && handlePageChange(pagination.currentPage + 1)}
                      className={pagination.hasNext ? "cursor-pointer" : "pointer-events-none opacity-50"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <p className="text-sm text-gray-400 mt-2">
                Showing {data.length} of {pagination.totalItems} items
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}