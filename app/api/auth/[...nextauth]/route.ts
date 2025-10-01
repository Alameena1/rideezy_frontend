import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { serverApiInstance } from "@/services/api";

interface CustomUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "user" | "admin";
  accessToken: string;
  refreshToken?: string;
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email/Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Authorize: Missing credentials", { email: credentials?.email });
          throw new Error("Missing credentials");
        }
        try {
          const email = credentials.email.trim().toLowerCase();
          const password = credentials.password.trim();
          console.log("Authorize: Sending login request", { email, passwordLength: password.length });
          const response = await serverApiInstance.post("/auth/login", {
            email,
            password,
          });
          const data = response.data;
          console.log("Authorize: Backend response", {
            success: data.success,
            userId: data.user?.id,
            role: data.user?.role,
            accessToken: data.accessToken ? "present" : "missing",
            refreshToken: data.refreshToken ? "present" : "missing",
          });

          if (!data.success || !data.accessToken || !data.user?.id) {
            console.error("Authorize: Invalid login response", { data });
            throw new Error(data.message || "Invalid login response");
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.fullName || data.user.email,
            role: data.user.role || "user",
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || undefined,
          };
        } catch (error: any) {
          console.error("Authorize: Credentials authorize error:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            requestPayload: { email: credentials.email.trim(), passwordLength: credentials.password.trim().length },
          });
          throw new Error(error.response?.data?.message || "Invalid email or password");
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        console.log("Google signIn:", { userId: user.id, email: user.email, role: user.role });
        try {
          const payload = {
            fullName: user.name || "",
            email: user.email || "",
            image: user.image || "",
            idToken: account?.id_token,
          };
          if (!payload.email || !payload.idToken) {
            console.error("Google signIn: Missing email or id_token", payload);
            throw new Error("Missing email or id_token");
          }
          const response = await serverApiInstance.post("/auth/google-auth", payload);
          const responseData = response.data;
          if (responseData.accessToken && responseData.user) {
            (user as CustomUser).id = responseData.user.id;
            (user as CustomUser).accessToken = responseData.accessToken;
            (user as CustomUser).refreshToken = responseData.refreshToken;
            (user as CustomUser).role = responseData.user.role || "user";
            console.log("Google signIn: Success", {
              userId: responseData.user.id,
              role: responseData.user.role,
              accessToken: responseData.accessToken ? "present" : "missing",
            });
            return true;
          }
          console.error("Google signIn: Invalid backend response", responseData);
          throw new Error("Invalid backend response");
        } catch (error: any) {
          console.error("Google signIn failed:", error.message, error.response?.data);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        console.log("JWT Callback: Token updated", {
          id: token.id,
          role: token.role,
          accessToken: token.accessToken ? "present" : "missing",
          refreshToken: token.refreshToken ? "present" : "missing",
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as CustomUser).id = token.id as string;
        (session.user as CustomUser).role = token.role as "user" | "admin";
        (session.user as CustomUser).accessToken = token.accessToken as string;
        (session.user as CustomUser).refreshToken = token.refreshToken as string;
        console.log("Session Callback: Session updated", {
          userId: session.user.id,
          role: session.user.role,
          accessToken: session.user.accessToken ? "present" : "missing",
        });
      }
      return session;
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/`;
    },
  },
  pages: {
    signIn: "/user/login",
    error: "/auth-error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST, authOptions };