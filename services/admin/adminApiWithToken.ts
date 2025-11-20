import { createAdminApiInstance } from "../unifiedInterceptor";
import { getServerSession } from "next-auth";
import { authOptions } from "../../app/api/auth/[...nextauth]/route";

// Function to get admin token for server-side requests
const getAdminToken = async (): Promise<string | null> => {
  try {
    const session = await getServerSession(authOptions);
    return (session?.user as any)?.accessToken || null;
  } catch (error) {
    console.error("Failed to get admin token:", error);
    return null;
  }
};

// Create admin API instance with server-side token support
const { api: adminApi, setupServerInterceptor } = createAdminApiInstance();

// Setup server interceptor with token function
const adminApiWithToken = setupServerInterceptor(getAdminToken);

export { adminApiWithToken as adminApi };