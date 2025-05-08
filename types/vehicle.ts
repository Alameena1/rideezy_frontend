export interface Vehicle {
    _id: string;
    vehicleName: string;
    mileage: number;
    vehicleType: string;
    licensePlate: string;
    color?: string;
    insuranceNumber?: string;
    status: "Pending" | "Approved" | "Rejected";
    imageUrl?: string;
    documentImage?: string;
  }