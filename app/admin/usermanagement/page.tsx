// src/pages/admin/users.tsx
"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/services/adminApi";
import { BackendUser } from "@/app/types";

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

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await adminApi.getUsers();
        console.log("Fetched users:", fetchedUsers);

        const mappedUsers: User[] = fetchedUsers.map((user: BackendUser) => ({
          _id: user._id,
          name: user.fullName || "Unknown",
          email: user.email || "N/A",
          phone: user.phoneNumber || "N/A",
          totalRides: "0/0", 
          registrationDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A",
          status: user.status || "Active",
          subscribed: false, 
          govtIdStatus: "Pending",
        }));

        setUsers(mappedUsers);
      } catch (err) {
        console.error("Fetch users failed:", err);
        setError(err.message || "Failed to fetch users");
        throw err;
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: User) => {
    try {
      const newStatus = user.status === "Active" ? "Blocked" : "Active";
      await adminApi.toggleUserStatus(user.email, newStatus); 
      setUsers(users.map(u => 
        u.email === user.email ? { ...u, status: newStatus } : u
      ));
    } catch (err) {
      console.error("Toggle status failed:", err);
      setError(err.message || "Failed to update user status");
    }
  };

  const renderStatus = (status: string) => {
    const color = status === "Active" ? "text-green-500" : "text-red-500";
    return <span className={color}>{status}</span>;
  };

  const renderGovtIdStatus = (status: string) => {
    if (status === "Verified") {
      return <span className="text-blue-500">{status}</span>;
    } else if (status === "Pending") {
      return <span className="text-orange-500">{status}</span>;
    }
    return <span>{status}</span>;
  };

  return (
    <div className="bg-gray-900 text-white p-6">
      <h2 className="text-2xl font-semibold mb-6">User Management</h2>

      {error && (
        <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-center text-gray-400">No users found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-left">
                <th className="p-3 border-b border-gray-700">#</th>
                <th className="p-3 border-b border-gray-700">NAME</th>
                <th className="p-3 border-b border-gray-700">Email</th>
                <th className="p-3 border-b border-gray-700">Phone</th>
                <th className="p-3 border-b border-gray-700">
                  Total Rides<br />(offered/joined)
                </th>
                <th className="p-3 border-b border-gray-700">
                  Date of<br />Registration
                </th>
                <th className="p-3 border-b border-gray-700">Status</th>
                <th className="p-3 border-b border-gray-700">Subscribed</th>
                <th className="p-3 border-b border-gray-700">Govt ID Status</th>
                <th className="p-3 border-b border-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={index} className="border-b border-gray-800 hover:bg-gray-800">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.phone}</td>
                  <td className="p-3">{user.totalRides}</td>
                  <td className="p-3">{user.registrationDate}</td>
                  <td className="p-3">{renderStatus(user.status)}</td>
                  <td className="p-3">{user.subscribed ? "True" : "False"}</td>
                  <td className="p-3">{renderGovtIdStatus(user.govtIdStatus)}</td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className="bg-gray-700 text-white rounded p-2 hover:bg-gray-600"
                      >
                        {user.status === "Active" ? "Block" : "Activate"}
                      </button>
                      <button className="bg-gray-700 text-white rounded p-2 hover:bg-gray-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}