"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Provider from "./Provider";
import 'leaflet/dist/leaflet.css';
import { Toaster } from "@/components/ui/sonner";
import ToastWrapper from './comp/ToastWrapper';
import ClientInterceptorWrapper from './ClientInterceptorWrapper';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Provider>
          <ClientInterceptorWrapper>
            {children}
            <Toaster />
            <ToastWrapper />
          </ClientInterceptorWrapper>
        </Provider>
      </body>
    </html>
  );
}
