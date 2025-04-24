import { Button } from "@/components/ui/button"
import { Car, Plus } from "lucide-react"

export default function EmptyState() {
  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <Car className="h-8 w-8 text-gray-500" />
      </div>
      <h3 className="text-xl font-medium mb-2">No vehicles registered yet</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Register your first vehicle to get started with our services
      </p>
      <Button className="flex items-center gap-2">
        <Plus className="h-4 w-4" /> Register Now
      </Button>
    </div>
  )
}