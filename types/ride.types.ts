// src/types/ride.types.ts
export const rideStatus = ["Pending", "Started", "Completed", "Cancelled"] as const;
export type RideStatus = typeof rideStatus[number];

export interface EditRideDto {
  date?: string; // Optional, matches backend's .optional()
  time?: string; // Optional, matches backend's .optional()
  status?: RideStatus; // Optional, matches backend's .optional()
}