import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DefaultSession, JWT } from "next-auth";

interface CustomUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  access_token?: string;
  refresh_token?: string;
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
    async signIn({ user, account, profile }) {
      try {
        const payload = {
          fullName: user.name || "",
          email: user.email || "",
          image: user.image || "",
        };

        const response = await fetch("http://localhost:3001/api/auth/google-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (response.ok && responseData.accessToken) {
          // Attach backend token to the user object
          (user as CustomUser).access_token = responseData.accessToken;
          (user as CustomUser).refresh_token = responseData.refreshToken;
          return true;
        } else {
          console.error("Google Auth API failed:", responseData);
          return false;
        }
      } catch (error) {
        console.error("Error during Google signIn:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.access_token = (user as CustomUser).access_token;
        token.refresh_token = (user as CustomUser).refresh_token;
      }
      return token;
    },

    async session({ session, token }) {
      (session.user as CustomUser).id = token.sub as string;
      (session.user as CustomUser).access_token = token.access_token as string;
      (session.user as CustomUser).refresh_token = token.refresh_token as string;
      return session;
    },

    async redirect({ baseUrl }) {
      return `${baseUrl}/`; // redirect to homepage
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
