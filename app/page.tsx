"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ServiceSection from "./components/ServiceSection";
import Footer from "./components/Footer";

export default function Home() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      const accessToken = session.user.access_token;
      const refreshToken = session.user.refresh_token;
      if (accessToken) {
        localStorage.setItem("accessToken", accessToken);
        console.log("✅ Access token stored from Google login");
      }
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
        console.log("✅ Refresh token stored from Google login");
      }
    }
  }, [session, status]);

  return (
    <>
      <Navbar />
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
