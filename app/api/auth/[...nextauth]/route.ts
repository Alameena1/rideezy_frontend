import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { serverApiInstance } from "@/services/api";
import Cookies from "js-cookie";

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
          console.error("Authorize: Missing credentials");
          throw new Error("Missing credentials");
        }
        try {
          const response = await serverApiInstance.post("/auth/login", {
            email: credentials.email,
            password: credentials.password,
          });
          const data = response.data;
          if (!data.accessToken || !data.user) {
            console.error("Authorize: Invalid login response", data);
            throw new Error("Invalid login response");
          }
          return {
            id: data.user.id || "",
            email: data.user.email,
            name: data.user.fullName || "",
            role: data.user.role || "user",
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch (error: any) {
          console.error("Credentials authorize error:", error.message, error.response?.data);
          throw new Error("Invalid email or password");
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
        console.log("Google signIn:", { user, account });
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
            // Store tokens in cookies
            Cookies.set("accessToken", responseData.accessToken, {
              expires: 1,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
            });
            Cookies.set("refreshToken", responseData.refreshToken, {
              expires: 7,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
            });
            console.log("Google signIn: Success", responseData);
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as CustomUser).id = token.id as string;
        (session.user as CustomUser).role = token.role as "user" | "admin";
        (session.user as CustomUser).accessToken = token.accessToken as string;
        (session.user as CustomUser).refreshToken = token.refreshToken as string;
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