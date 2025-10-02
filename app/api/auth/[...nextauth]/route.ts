// app/api/auth/[...nextauth]/route.ts - FIXED
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

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
        isAdmin: { label: "Is Admin", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("❌ Authorize: Missing credentials");
          throw new Error("Email and password are required");
        }
        
        try {
          const email = credentials.email.trim().toLowerCase();
          const password = credentials.password.trim();
          const isAdmin = credentials.isAdmin === "true";

          console.log("🔐 Authorize: Attempting login", { 
            email, 
            isAdmin
          });

          const backendBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
          
          // FIX: Use correct endpoints based on your server routes
          const endpoint = isAdmin ? "/admin/login" : "/api/auth/login"; // Changed from /auth/login to /api/auth/login
          const url = `${backendBaseURL}${endpoint}`;
          
          console.log("📤 Calling backend:", url);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          console.log("📥 Backend response status:", response.status);

          if (!response.ok) {
            let errorMessage = `Login failed: ${response.status}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
            } catch {
              try {
                const errorText = await response.text();
                if (errorText) errorMessage = errorText.substring(0, 100);
              } catch {
                errorMessage = response.statusText || errorMessage;
              }
            }
            throw new Error(errorMessage);
          }

          const data = await response.json();
          console.log("📥 Backend success response:", { 
            success: data.success, 
            userRole: data.user?.role 
          });

          if (!data.success || !data.accessToken || !data.user?.id) {
            throw new Error(data.message || "Invalid login response");
          }

          // Return user object for NextAuth
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.fullName || data.user.name || data.user.email,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };

        } catch (error: any) {
          console.error("💥 Authorize error:", error.message);
          
          let userMessage = error.message;
          if (error.name === 'AbortError') {
            userMessage = "Request timeout - server is not responding";
          } else if (error.message.includes('fetch failed')) {
            userMessage = "Cannot connect to server - make sure backend is running";
          }

          throw new Error(userMessage);
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
    async signIn({ user, account, credentials }) {
      if (account?.provider === "google") {
        console.log("🔐 Google signIn:", { userId: user.id, email: user.email });
        try {
          const backendBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
          const payload = {
            fullName: user.name || "",
            email: user.email || "",
            image: user.image || "",
            idToken: account?.id_token,
          };
          
          if (!payload.email || !payload.idToken) {
            console.error("❌ Google signIn: Missing email or id_token", payload);
            throw new Error("Missing email or id_token");
          }
          
          // FIX: Use correct Google auth endpoint
          const response = await fetch(`${backendBaseURL}/api/auth/google-auth`, { // Changed from /auth/google-auth to /api/auth/google-auth
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Google auth failed: ${response.status}`);
          }
          
          const responseData = await response.json();
          
          if (responseData.accessToken && responseData.user) {
            (user as CustomUser).id = responseData.user.id;
            (user as CustomUser).accessToken = responseData.accessToken;
            (user as CustomUser).refreshToken = responseData.refreshToken;
            (user as CustomUser).role = responseData.user.role || "user";
            console.log("✅ Google signIn: Success", {
              userId: responseData.user.id,
              role: responseData.user.role,
            });
            return true;
          }
          console.error("❌ Google signIn: Invalid backend response", responseData);
          throw new Error("Invalid backend response");
        } catch (error: any) {
          console.error("💥 Google signIn failed:", error.message);
          return false;
        }
      }
      return true;
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as CustomUser).role;
        token.accessToken = (user as CustomUser).accessToken;
        token.refreshToken = (user as CustomUser).refreshToken;
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
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout", 
    error: "/auth/error",
  },
  session: { 
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST, authOptions };