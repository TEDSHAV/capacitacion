import { NextRequest, NextResponse } from "next/server";
import { CourseSatisfactionSurvey } from "@/types";
import { submitSurveyCore } from "@/lib/surveys/submit-survey-core";

/**
 * POST /api/surveys/submit
 * Public endpoint for submitting surveys (used by offline queue).
 * Accepts a CourseSatisfactionSurvey object and submits it to the database.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.id_osi || typeof body.id_osi !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid id_osi" },
        { status: 400 }
      );
    }

    const survey: CourseSatisfactionSurvey = {
      id_osi: body.id_osi,
      nro_sesion: body.nro_sesion ?? 1,
      q1: body.q1,
      q2: body.q2,
      q3: body.q3,
      q4: body.q4,
      q5: body.q5,
      q6: body.q6,
      q7: body.q7,
      q8: body.q8,
      q9: body.q9,
      q10: body.q10,
      attendance_reasons: body.attendance_reasons,
    };

    const result = await submitSurveyCore(survey);

    if (result.success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to submit survey" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/surveys/submit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
