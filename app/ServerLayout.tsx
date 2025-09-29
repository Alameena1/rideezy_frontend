import type { Metadata } from "next";
import RootLayout from "./layout";

export const metadata: Metadata = {
  title: 'RideEzy - Your Ride Sharing Platform',
  description: 'Book rides, drive when you want, and travel safely with RideEzy',
};

export default function ServerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootLayout>{children}</RootLayout>;
}