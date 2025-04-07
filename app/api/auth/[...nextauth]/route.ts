import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        const response = await fetch("http://localhost:5000/api/auth/google-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(user),
        });

        const responseData = await response.json(); 
        console.log("Google Auth API Response:", responseData);

        return response.ok;
      } catch (error) {
        console.error("Error during signIn:", error);
        return false;
      }
    },

    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      } else {
        console.warn("Token does not contain sub:", token);
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      return new URL("/", baseUrl).toString();
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
