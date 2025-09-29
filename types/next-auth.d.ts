// types/next-auth.d.ts
import { DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "user" | "admin";
    accessToken: string;
    refreshToken?: string;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "user" | "admin";
    accessToken: string;
    refreshToken?: string;
  }
}