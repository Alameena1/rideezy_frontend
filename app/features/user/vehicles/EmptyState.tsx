import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Plus } from "lucide-react";

interface EmptyStateProps {
  onAddVehicle?: () => void;
}

export default function EmptyState({ onAddVehicle }: EmptyStateProps) {
  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white">
      <CardContent className="text-center py-16 px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-6">
          <Car className="h-10 w-10 text-blue-500" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">No vehicles registered yet</h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
          Register your first vehicle to get started with ride sharing and earn money
        </p>
        {onAddVehicle && (
          <Button 
            onClick={onAddVehicle}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" /> 
            Register Your First Vehicle
          </Button>
        )}
      </CardContent>
    </Card>
  );
}