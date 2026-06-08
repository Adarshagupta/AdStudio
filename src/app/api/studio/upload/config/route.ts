import { NextResponse } from "next/server";

import { studioUploadMethod } from "@/lib/r2";

export async function GET() {
  return NextResponse.json({ method: studioUploadMethod() });
}
