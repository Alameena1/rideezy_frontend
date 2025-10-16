"use client";

import { useEffect } from "react";
import MainLayout from "@/app/comp/MainLayout";
import { RideDetailsProvider, useRideDetails } from "@/app/features/user/ridedetails/context/RideDetailsContext";
import RideDetailsContent from "@/app/features/user/ridedetails/components/RideDetailsContent";

function RideDetailsPageContent() {
  const { fetchRides } = useRideDetails();

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  return <RideDetailsContent />;
}

export default function RideDetailsPage() {
  return (
    <RideDetailsProvider>
      <MainLayout activeItem="Rides">
        <RideDetailsPageContent />
      </MainLayout>
    </RideDetailsProvider>
  );
}