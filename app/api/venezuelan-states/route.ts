import { NextRequest, NextResponse } from "next/server";
import { getVenezuelanStates } from "@/app/actions/certificados";

export async function GET(request: NextRequest) {
  try {
    const states = await getVenezuelanStates();
    
    return NextResponse.json(states);
  } catch (error) {
    console.error("Error fetching Venezuelan states:", error);
    return NextResponse.json(
      { error: "Failed to fetch Venezuelan states" },
      { status: 500 }
    );
  }
}
