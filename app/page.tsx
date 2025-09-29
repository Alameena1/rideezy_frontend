"use client";

import { useSession } from "next-auth/react";
import ClientNavbarWrapper from "./comp/ClientNavbarWrapper";
import Hero from "./comp/Hero";
import ServiceSection from "./comp/ServiceSection";
import Footer from "./comp/Footer";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <>
      <ClientNavbarWrapper />
      <Hero
        title="Drive when you want"
        subtitle="Make what you need with flexible hours and great earnings"
        imageUrl="/15783581-e9c2-49ab-91f7-f2ca6d113efb.jpeg"
        ctaText="Start Driving"
        ctaLink="/drive"
      />
      <ServiceSection
        title="Plan Your Ride (Reserve a Ride)"
        description="Plan your trip in advance with our reservation system and secure your ride before your trip!"
        imageUrl="/15783581-e9c2-49ab-91f7-f2ca6d113efb.jpeg"
        imagePosition="left"
        ctaText="Book Now"
        ctaLink="/ride"
      />
      <ServiceSection
        title="Business & Group Travel"
        description="Special rates for business travel and group bookings. Perfect for corporate events, team outings, and large groups."
        imageUrl="/15783581-e9c2-49ab-91f7-f2ca6d113efb.jpeg"
        imagePosition="right"
        ctaText="Learn More"
        ctaLink="/business"
      />
      <ServiceSection
        title="Safe & Verified Rides"
        description="We verify certified drivers for a safe and enjoyable ride. All rides are tracked and monitored for your safety."
        imageUrl="/15783581-e9c2-49ab-91f7-f2ca6d113efb.jpeg"
        imagePosition="left"
        ctaText="See Safety Features"
        ctaLink="/safety"
      />
      <Footer />
    </>
  );
}