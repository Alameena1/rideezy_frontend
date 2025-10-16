"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useRideDetails } from "../context/RideDetailsContext";
import { useRideSimulation } from "../hooks/useRideSimulation";

export default function EmergencyStopModal() {
  const { emergencyStopModalOpen, closeEmergencyStopModal, selectedRideForStop } = useRideDetails();
  const { handleEmergencyStop } = useRideSimulation();
  const [stopReason, setStopReason] = useState("");
  const [isStopping, setIsStopping] = useState(false);

  const confirmStop = async () => {
    if (!selectedRideForStop || !stopReason.trim()) return;
    
    try {
      setIsStopping(true);
      await handleEmergencyStop(selectedRideForStop._id, stopReason);
      closeEmergencyStopModal();
      setStopReason("");
    } catch (error) {
      console.error("Emergency stop failed:", error);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <Dialog open={emergencyStopModalOpen} onOpenChange={closeEmergencyStopModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Emergency Stop Ride
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertDescription className="text-sm">
              <strong>Warning:</strong> This will stop the ride immediately and process partial refunds to passengers. This action cannot be undone.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <Label htmlFor="stopReason" className="text-sm font-medium">
              Reason for Emergency Stop
            </Label>
            <Select value={stopReason} onValueChange={setStopReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vehicle breakdown">Vehicle breakdown</SelectItem>
                <SelectItem value="Tire puncture">Tire puncture</SelectItem>
                <SelectItem value="Accident">Accident</SelectItem>
                <SelectItem value="Medical emergency">Medical emergency</SelectItem>
                <SelectItem value="Weather conditions">Weather conditions</SelectItem>
                <SelectItem value="Road blockage">Road blockage</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            
            {stopReason === "Other" && (
              <Input
                placeholder="Please specify the reason..."
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
              />
            )}
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Refund Policy</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Less than 25% traveled: 80% refund</li>
              <li>• 25-50% traveled: 60% refund</li>
              <li>• 50-75% traveled: 40% refund</li>
              <li>• More than 75% traveled: 20% refund</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={closeEmergencyStopModal}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={confirmStop}
            disabled={!stopReason.trim() || isStopping}
            className="bg-red-600 hover:bg-red-700"
          >
            {isStopping ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              "Confirm Emergency Stop"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}