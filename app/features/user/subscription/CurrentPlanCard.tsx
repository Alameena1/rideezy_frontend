import { Card } from "@/components/ui/card";

interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
}

interface CurrentSubscription {
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
}

interface CurrentPlanCardProps {
  currentSubscription: CurrentSubscription | null;
}

export default function CurrentPlanCard({ currentSubscription }: CurrentPlanCardProps) {
  return (
    <Card className="p-6 shadow-md bg-white mb-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Current Plan</h3>
      {currentSubscription ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Plan:</span> {currentSubscription.plan.name}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Price:</span> ₹{currentSubscription.plan.price}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Duration:</span> {currentSubscription.plan.durationMonths} month(s)
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Description:</span> {currentSubscription.plan.description}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Start Date:</span>{" "}
            {new Date(currentSubscription.startDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">End Date:</span>{" "}
            {new Date(currentSubscription.endDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      ) : (
        <p className="text-gray-600 text-sm">You do not have an active subscription.</p>
      )}
    </Card>
  );
}