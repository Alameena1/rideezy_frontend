// app/api/proxy/admin/login/route.ts - UPDATED WITH DEBUGGING
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("🔐 Proxying admin login request:", { email: body.email });
    
    const backendURL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';
    const url = `${backendURL}/admin/login`;
    
    console.log("📤 Calling backend:", url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log("📥 Backend response status:", response.status);
    
    // Get response as text first to handle any format
    const responseText = await response.text();
    console.log("📥 Backend response text:", responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse backend response as JSON:", parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid response from backend server' },
        { status: 500 }
      );
    }

    console.log("✅ Proxy successful, returning:", { 
      success: data.success, 
      status: response.status 
    });
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error: any) {
    console.error("💥 Proxy error:", error.message);
    console.error("💥 Proxy error stack:", error.stack);
    
    return NextResponse.json(
      { success: false, message: `Proxy error: ${error.message}` },
      { status: 500 }
    );
  }
}