import { Card } from "@/components/ui/card";
import PlanCard from "./PlanCard";

interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
}

interface AvailablePlansSectionProps {
  availablePlans: SubscriptionPlan[];
  paymentLoading: string | null;
  onSubscribe: (plan: SubscriptionPlan) => void;
}

export default function AvailablePlansSection({
  availablePlans,
  paymentLoading,
  onSubscribe,
}: AvailablePlansSectionProps) {
  return (
    <Card className="p-6 shadow-md bg-white">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">Available Plans</h3>
      {availablePlans.length === 0 ? (
        <p className="text-gray-600 text-sm">No subscription plans available.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {availablePlans.map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              paymentLoading={paymentLoading}
              onSubscribe={onSubscribe}
            />
          ))}
        </div>
      )}
    </Card>
  );
}