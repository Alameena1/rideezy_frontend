// pages/404.tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home } from "lucide-react";
import Image from "next/image";
import Head from "next/head";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found</title>
        <meta name="description" content="The page you are looking for does not exist." />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-6 max-w-md mx-auto p-6">
          <div className="relative w-64 h-64 mx-auto">
            <Image
              src="/404-illustration.svg"
              alt="404 Not Found"
              fill
              className="object-contain"
              priority
              onError={(e) => {
                console.error("Image failed to load:", e);
                // Fallback to a placeholder or hide the image
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
            404 - Page Not Found
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Oops! It looks like you&apos;ve wandered off the map. The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild className="mt-4">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}