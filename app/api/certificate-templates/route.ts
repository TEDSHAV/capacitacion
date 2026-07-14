import { NextRequest, NextResponse } from "next/server";
import { getCertificateTemplates } from "@/app/actions/certificados";

export async function GET(request: NextRequest) {
  try {
    const templates = await getCertificateTemplates();
    
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching certificate templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificate templates" },
      { status: 500 }
    );
  }
}
