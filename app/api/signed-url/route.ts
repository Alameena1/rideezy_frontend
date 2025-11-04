import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { public_id, resource_type = 'image', expiration = 3600 } = await request.json();

    if (!public_id) {
      return NextResponse.json({ error: "Public ID is required" }, { status: 400 });
    }

    console.log("Generating signed URL for:", { public_id, resource_type, expiration });

    // First, check if the resource exists
    try {
      const resourceInfo = await cloudinary.api.resource(public_id, {
        resource_type: resource_type,
        type: 'authenticated' // Check if it's an authenticated resource
      });
      console.log("Resource found:", resourceInfo);
    } catch (resourceError: any) {
      console.error("Resource not found or inaccessible:", resourceError);
      return NextResponse.json(
        { 
          error: "Image not found in Cloudinary",
          details: resourceError.message 
        },
        { status: 404 }
      );
    }

    // Generate signed URL with proper options
    const signedUrl = cloudinary.url(public_id, {
      resource_type: resource_type,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + expiration,
      secure: true,
      type: 'authenticated', // This is crucial!
    });

    console.log("Generated signed URL:", signedUrl);

    return NextResponse.json({ 
      signed_url: signedUrl,
      expires_in: expiration
    });
  } catch (error: any) {
    console.error("Signed URL generation failed:", error);
    return NextResponse.json(
      {
        error: "Failed to generate signed URL",
        details: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}