import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  paymentLoading: string | null;
  onSubscribe: (plan: SubscriptionPlan) => void;
}

export default function PlanCard({ plan, paymentLoading, onSubscribe }: PlanCardProps) {
  return (
    <Card className="p-5 border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-0 space-y-3">
        <h4 className="text-lg font-semibold text-gray-800">{plan.name}</h4>
        <p className="text-sm text-gray-600">{plan.description}</p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Price:</span> ₹{plan.price}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Duration:</span> {plan.durationMonths} month(s)
          </p>
        </div>
      </CardContent>
      <CardFooter className="p-0 pt-4">
        <Button
          onClick={() => onSubscribe(plan)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
          disabled={paymentLoading === plan._id}
        >
          {paymentLoading === plan._id ? "Processing..." : "Subscribe Now"}
        </Button>
      </CardFooter>
    </Card>
  );
}