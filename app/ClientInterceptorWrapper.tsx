"use client";

import { useApiInterceptors } from "@/services/client-api";
import { ReactNode } from "react";

export default function ClientInterceptorWrapper({ children }: { children: ReactNode }) {
  useApiInterceptors(); // Call within SessionProvider context
  return <>{children}</>;
}