"use client";

import { useState, useEffect } from "react";
import { apiService } from "@/services/api";

interface User {
  _id: string;
  fullName: string;
  email: string;
  govId: {
    idNumber: string;
    documentUrl: string;
    verificationStatus: "Pending" | "Verified" | "Rejected";
    rejectionNote?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export default function UserIdVerification() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionNote, setRejectionNote] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await apiService.admin.user;
        console.log("Fetched users data:", fetchedUsers);
        if (Array.isArray(fetchedUsers)) {
         
          const usersWithGovId = fetchedUsers.filter((user: User) => user.govId && user.govId.idNumber);
          setUsers(usersWithGovId);
        } else {
          console.error("Unexpected response format:", fetchedUsers);
          setUsers([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch users";
        console.error("Fetch users failed:", err);
        setError(errorMessage);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleApproveUser = async (userId: string) => {
    try {
      await apiService.admin.vehicle.verifyGovId(userId, "Verified");
      setUsers(users.map((user) =>
        user._id === userId ? { ...user, govId: { ...user.govId, verificationStatus: "Verified" } } : user
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve user ID";
      console.error("Approve user ID failed:", err);
      setError(errorMessage);
    }
  };

  const openRejectionModal = (userId: string) => {
    setSelectedUser(userId);
    setRejectionNote("");
    setShowRejectionModal(true);
  };

  const handleRejectUser = async () => {
    if (!selectedUser || !rejectionNote.trim()) {
      setError("Rejection reason is required");
      return;
    }

    try {
      await apiService.admin.vehicle.verifyGovId(selectedUser, "Rejected", rejectionNote);
      setUsers(users.map((user) =>
        user._id === selectedUser ? { ...user, govId: { ...user.govId, verificationStatus: "Rejected", rejectionNote } } : user
      ));
      setShowRejectionModal(false);
      setSelectedUser(null);
      setRejectionNote("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject user ID";
      console.error("Reject user ID failed:", err);
      setError(errorMessage);
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "Verified":
        return <span className="text-green-500">Verified</span>;
      case "Rejected":
        return <span className="text-red-500">Rejected</span>;
      default:
        return <span className="text-orange-500">Pending</span>;
    }
  };

  const viewDocument = (documentUrl?: string) => {
    if (!documentUrl) {
      alert("No document available to view.");
      return;
    }
    window.open(documentUrl, "_blank");
  };

  return (
    <div className="bg-gray-900 text-white p-6">
      <h2 className="text-2xl font-semibold mb-6">User ID Verification Management</h2>

      {error && (
        <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-center text-gray-400">No users found for ID verification.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-left">
                <th className="p-3 border-b border-gray-700">#</th>
                <th className="p-3 border-b border-gray-700">Name</th>
                <th className="p-3 border-b border-gray-700">Email</th>
                <th className="p-3 border-b border-gray-700">ID Number</th>
                <th className="p-3 border-b border-gray-700">Submitted On</th>
                <th className="p-3 border-b border-gray-700">Status</th>
                <th className="p-3 border-b border-gray-700">Document</th>
                <th className="p-3 border-b border-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user._id} className="border-b border-gray-800 hover:bg-gray-800">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{user.fullName || "Unknown"}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.govId.idNumber}</td>
                  <td className="p-3">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="p-3">{renderStatus(user.govId.verificationStatus)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => viewDocument(user.govId.documentUrl)}
                      className="bg-purple-800 text-white rounded p-2 hover:bg-purple-700"
                      title="View Document"
                      disabled={!user.govId.documentUrl}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      {user.govId.verificationStatus === "Pending" && (
                        <>
                          <button
                            onClick={() => handleApproveUser(user._id)}
                            className="bg-green-700 text-white rounded p-2 hover:bg-green-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectionModal(user._id)}
                            className="bg-red-700 text-white rounded p-2 hover:bg-red-600"
                          >
                            Reject
                          </button>
                        </>
                      )}
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

      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Rejection Reason</h3>
            <p className="text-gray-300 mb-4">
              Please provide a reason why this user ID verification is being rejected:
            </p>
            <textarea
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              rows={4}
              placeholder="Enter rejection reason..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
            ></textarea>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => setShowRejectionModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-600"
                onClick={handleRejectUser}
              >
                Reject User ID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}