"use client";

import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
// @ts-ignore
import Swal from 'sweetalert2';

interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  status: "Active" | "Blocked";
  createdAt: string;
  updatedAt?: string;
}

export default function Subscription() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [currentPlan, setCurrentPlan] = useState<Partial<SubscriptionPlan>>({
    name: "",
    durationMonths: 0,
    price: 0,
    description: "",
  });
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const fetchedSubscriptions = await apiService.admin.subscription.getSubscriptionPlans();
        if (Array.isArray(fetchedSubscriptions)) {
          setSubscriptions(fetchedSubscriptions);
        } else {
          setSubscriptions([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch subscriptions";
        setError(errorMessage);
        setSubscriptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const openAddModal = () => {
    setModalMode("add");
    setCurrentPlan({ name: "", durationMonths: 0, price: 0, description: "" });
    setModalError(null);
    setShowModal(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setModalMode("edit");
    setCurrentPlan(plan);
    setModalError(null);
    setShowModal(true);
  };

  const handleSavePlan = async () => {
    if (!currentPlan.name || !currentPlan.durationMonths || !currentPlan.price || !currentPlan.description) {
      setModalError("ALL FIELDS ARE REQUIRED");
      return;
    }

    try {
      if (modalMode === "add") {
        const createdPlan = await apiService.admin.subscription.createSubscriptionPlan(currentPlan);
        setSubscriptions([...subscriptions, createdPlan]);
      } else {
        const updatedPlan = await apiService.admin.subscription.updateSubscriptionPlan(currentPlan._id!, currentPlan);
        setSubscriptions(subscriptions.map((plan) =>
          plan._id === currentPlan._id ? updatedPlan : plan
        ));
      }
      setShowModal(false);
      setModalError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${modalMode === "add" ? "add" : "update"} subscription plan`;
      setModalError(errorMessage);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      await apiService.admin.subscription.deleteSubscriptionPlan(planId);
      setSubscriptions(subscriptions.filter((plan) => plan._id !== planId));
      Swal.fire(
        'Deleted!',
        'The subscription plan has been deleted.',
        'success'
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete subscription plan";
      setError(errorMessage);
      Swal.fire(
        'Error!',
        errorMessage,
        'error'
      );
    }
  };

  const handleToggleStatus = async (planId: string, currentStatus: "Active" | "Blocked") => {
    const newStatus = currentStatus === "Active" ? "Blocked" : "Active";
    try {
      await apiService.admin.subscription.toggleSubscriptionPlanStatus(planId, newStatus);
      setSubscriptions(subscriptions.map((plan) =>
        plan._id === planId ? { ...plan, status: newStatus } : plan
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update subscription plan status";
      setError(errorMessage);
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "Active":
        return <span className="text-green-500">Active</span>;
      case "Blocked":
        return <span className="text-red-500">Blocked</span>;
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  };

  return (
    <>
      <div className="bg-gray-900 text-white p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Subscription Management</h2>
          <button
            onClick={openAddModal}
            className="bg-blue-700 text-white rounded p-2 hover:bg-blue-600"
          >
            Add New Plan
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center text-gray-400">No subscription plans found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800 text-left">
                  <th className="p-3 border-b border-gray-700">#</th>
                  <th className="p-3 border-b border-gray-700">Name</th>
                  <th className="p-3 border-b border-gray-700">Duration (Months)</th>
                  <th className="p-3 border-b border-gray-700">Price ($)</th>
                  <th className="p-3 border-b border-gray-700">Description</th>
                  <th className="p-3 border-b border-gray-700">Created On</th>
                  <th className="p-3 border-b border-gray-700">Status</th>
                  <th className="p-3 border-b border-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription, index) => (
                  <tr key={subscription._id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3">{subscription.name}</td>
                    <td className="p-3">{subscription.durationMonths}</td>
                    <td className="p-3">{subscription.price}</td>
                    <td className="p-3">{subscription.description}</td>
                    <td className="p-3">
                      {subscription.createdAt ? new Date(subscription.createdAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-3">{renderStatus(subscription.status)}</td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleStatus(subscription._id, subscription.status)}
                          className={`${
                            subscription.status === "Active" ? "bg-red-700 hover:bg-red-600" : "bg-green-700 hover:bg-green-600"
                          } text-white rounded p-2`}
                        >
                          {subscription.status === "Active" ? "Block" : "Activate"}
                        </button>
                        <button
                          onClick={() => openEditModal(subscription)}
                          className="bg-yellow-700 text-white rounded p-2 hover:bg-yellow-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePlan(subscription._id)}
                          className="bg-red-700 text-white rounded p-2 hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Unified Modal for Add/Edit */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">
                {modalMode === "add" ? "Add New Subscription Plan" : "Edit Subscription Plan"}
              </h3>
              {modalError && (
                <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800 mb-4">
                  {modalError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-1">
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Plan Name"
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    value={currentPlan.name}
                    onChange={(e) => setCurrentPlan({ ...currentPlan, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    placeholder="Duration (Months)"
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    value={currentPlan.durationMonths}
                    onChange={(e) => setCurrentPlan({ ...currentPlan, durationMonths: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Price ($)</label>
                  <input
                    type="number"
                    placeholder="Price ($)"
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    value={currentPlan.price}
                    onChange={(e) => setCurrentPlan({ ...currentPlan, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Description</label>
                  <textarea
                    placeholder="Description"
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    rows={3}
                    value={currentPlan.description}
                    onChange={(e) => setCurrentPlan({ ...currentPlan, description: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
                  onClick={() => {
                    setShowModal(false);
                    setModalError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`${
                    modalMode === "add" ? "bg-blue-700 hover:bg-blue-600" : "bg-yellow-700 hover:bg-yellow-600"
                  } text-white px-4 py-2 rounded`}
                  onClick={handleSavePlan}
                >
                  {modalMode === "add" ? "Add Plan" : "Update Plan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    </>
  );
}