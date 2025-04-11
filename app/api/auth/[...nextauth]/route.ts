import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DefaultSession, JWT } from "next-auth";

// Define custom interfaces
interface CustomUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  access_token?: string;
}

interface CustomSession extends DefaultSession {
  user: CustomUser;
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }: { user: Partial<CustomUser>; account?: any }) {
      try {
        console.log("User object received:", user);
        const payload = {
          fullName: user.name || "", // Map name to fullName
          email: user.email || "",
          image: user.image || "",
        };
        console.log("User sent to API:", payload);
        console.log("Full account object:", account);

        const response = await fetch("http://localhost:5000/api/auth/google-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();
        console.log("Google Auth API Response with details:", {
          status: response.status,
          headers: response.headers,
          ...responseData,
        });

        return response.ok;
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error during signIn:", error.message);
        } else {
          console.error("Unknown error during signIn:", error);
        }
        return false;
      }
    },
    async session({ session, token }: { session: CustomSession; token: JWT }) {
      if (token.sub) {
        session.user.id = token.sub;
      } else {
        console.warn("Token does not contain sub:", token);
        session.user.id = session.user.email || "default-id";
      }
      return session;
    },
    async redirect({ baseUrl }: { baseUrl: string }) {
      return new URL("/", baseUrl).toString();
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

