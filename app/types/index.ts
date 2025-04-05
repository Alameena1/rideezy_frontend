
export interface BackendUser {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    totalRidesOffered?: number;
    totalRidesJoined?: number;
    registrationDate?: string;
    status?: "Active" | "Blocked";
    subscribed?: boolean;
    govtIdStatus?: "Pending" | "Verified";
  }