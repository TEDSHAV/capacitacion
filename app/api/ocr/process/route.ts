import { NextRequest, NextResponse } from 'next/server';
import { OCRService } from '@/lib/ocr-service';
import { requireApiAuth } from '@/utils/api-auth';

// Increase max duration for OCR processing (Mistral OCR + AI fallback chat call
// can take longer than the default serverless timeout, especially on larger images)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Auth: accept dashboard (Supabase), cliente portal, and facilitador portal
  // sessions. The facilitador portal uses a cookie-based session, not Supabase
  // auth, so requireDashboardAuth would reject it with a 401.
  const auth = await requireApiAuth(request);
  if ('unauthorized' in auth) {
    return auth.unauthorized;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = (formData.get('mode') as string) || 'certificate';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read API keys from server-side env vars (prioritize Google Gemini for speed, free tier & accuracy)
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const mistralKey = process.env.MISTRAL_API_KEY || process.env.NEXT_PUBLIC_MISTRAL_API_KEY || '';

    if (!geminiKey && !mistralKey) {
      return NextResponse.json(
        { error: 'No se ha configurado ninguna clave de API para OCR (GEMINI_API_KEY o MISTRAL_API_KEY). Contacta al administrador.' },
        { status: 503 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF, JPG, or PNG file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    console.log('[OCR Route] FormData entries:', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      mode,
    });
    console.log('Processing OCR for file:', file.name, 'type:', file.type, 'size:', file.size);

    // Process the file with OCR (Gemini prioritized, Mistral fallback)
    const result = await OCRService.processImage(
      file,
      { geminiKey: geminiKey || undefined, mistralKey: mistralKey || undefined },
      mode as "certificate" | "portal"
    );

    console.log('OCR result:', { success: !result.error, error: result.error, participantsCount: result.participants?.length });

    if (result.error) {
      const isRateLimit = result.error.includes("429") || result.error.toLowerCase().includes("rate limit") || result.error.toLowerCase().includes("límite");
      return NextResponse.json(
        { error: result.error },
        { status: isRateLimit ? 429 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      text: result.text,
      markdown: result.markdown,
      participants: result.participants || [],
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process image' },
      { status: 500 }
    );
  }
}
