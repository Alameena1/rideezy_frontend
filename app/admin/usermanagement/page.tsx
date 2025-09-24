"use client";

import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  totalRides: string;
  registrationDate: string;
  status: string;
  subscribed: boolean;
  govtIdStatus: string;
}

interface PaginatedResponse {
  success: boolean;
  data: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response: PaginatedResponse = await apiService.admin.user.getUsers({
        page,
        limit,
        search,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      const mappedUsers: User[] = response.data.map((user: any) => ({
        _id: user._id.toString(),
        name: user.fullName || "Unknown",
        email: user.email || "N/A",
        phone: user.phone || "N/A",
        totalRides: user.totalRides || "0/0",
        registrationDate: user.createdAt
          ? new Date(user.createdAt).toLocaleDateString()
          : "N/A",
        status: user.status || "Active",
        subscribed: user.subscription?.isSubscribed || false,
        govtIdStatus: user.govId?.verificationStatus || "Pending",
      }));
      setUsers(mappedUsers);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.totalItems);
      setHasNext(response.pagination.hasNext);
      setHasPrev(response.pagination.hasPrev);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch users";
      console.error("Fetch users failed:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, search]);

  const handleToggleStatus = async (user: User) => {
    try {
      const newStatus = user.status === "Active" ? "Blocked" : "Active";
      await apiService.admin.user.toggleUserStatus(user._id, newStatus);
      setUsers(users.map((u) => (u._id === user._id ? { ...u, status: newStatus } : u)));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update user status";
      console.error("Toggle status failed:", err);
      setError(errorMessage);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const renderStatus = (status: string) => {
    const color = status === "Active" ? "text-green-500" : "text-red-500";
    return <span className={color}>{status}</span>;
  };

  const renderGovtIdStatus = (status: string) => {
    const color =
      status === "Verified" ? "text-blue-500" : status === "Pending" ? "text-orange-500" : "text-red-500";
    return <span className={color}>{status}</span>;
  };

  return (
    <div className="bg-gray-900 text-white p-6 min-h-screen">
      <h2 className="text-2xl font-semibold mb-6">User Management</h2>

      {error && (
        <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800 mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <Input
          placeholder="Search users by name or email..."
          value={search}
          onChange={handleSearch}
          className="max-w-md bg-gray-800 text-white border-gray-600"
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-400">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-center text-gray-400">No users found.</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-800 hover:bg-gray-800">
                <TableHead className="text-gray-200">#</TableHead>
                <TableHead className="text-gray-200">Name</TableHead>
                <TableHead className="text-gray-200">Email</TableHead>
                <TableHead className="text-gray-200">Phone</TableHead>
                <TableHead className="text-gray-200">Total Rides (offered/joined)</TableHead>
                <TableHead className="text-gray-200">Registration Date</TableHead>
                <TableHead className="text-gray-200">Status</TableHead>
                <TableHead className="text-gray-200">Subscribed</TableHead>
                <TableHead className="text-gray-200">Govt ID Status</TableHead>
                <TableHead className="text-gray-200">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow key={user._id} className="border-gray-700 hover:bg-gray-800">
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.totalRides}</TableCell>
                  <TableCell>{user.registrationDate}</TableCell>
                  <TableCell>{renderStatus(user.status)}</TableCell>
                  <TableCell>{user.subscribed ? "True" : "False"}</TableCell>
                  <TableCell>{renderGovtIdStatus(user.govtIdStatus)}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleToggleStatus(user)}
                      variant={user.status === "Active" ? "destructive" : "default"}
                      size="sm"
                    >
                      {user.status === "Active" ? "Block" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => hasPrev && setPage(page - 1)}
                    className={hasPrev ? "" : "pointer-events-none opacity-50"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      onClick={() => setPage(p)}
                      isActive={p === page}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => hasNext && setPage(page + 1)}
                    className={hasNext ? "" : "pointer-events-none opacity-50"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <p className="text-sm text-gray-400 mt-2">
              Showing {users.length} of {totalItems} users
            </p>
          </div>
        </>
      )}
    </div>
  );
}