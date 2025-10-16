"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit3 } from "lucide-react";
import { useRideDetails } from "../context/RideDetailsContext";
import { useRideSimulation } from "../hooks/useRideSimulation";

export default function EditRideModal() {
  const { editModalOpen, closeEditModal, selectedRide } = useRideDetails();
  const { handleEditRide } = useRideSimulation();
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedRide) return;
    
    try {
      await handleEditRide(selectedRide.rideId!, editDate, editTime);
      closeEditModal();
      setEditDate("");
      setEditTime("");
      setModalError(null);
    } catch (error: any) {
      setModalError(error.message);
    }
  };

  return (
    <Dialog open={editModalOpen} onOpenChange={(open) => {
      if (!open) {
        closeEditModal();
        setModalError(null);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-blue-600" />
            Edit Ride Schedule
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {modalError && (
            <Alert variant="destructive">
              <AlertDescription>{modalError}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">
              Ride Date
            </Label>
            <Input
              id="date"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="time" className="text-sm font-medium">
              Ride Time
            </Label>
            <Input
              id="time"
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={closeEditModal}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}