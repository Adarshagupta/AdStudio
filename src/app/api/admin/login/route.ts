import { NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "adarsh@sylicaai.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adarsh@8";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create a simple session token
    const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

    const response = NextResponse.json({ success: true });

    // Set cookie
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
