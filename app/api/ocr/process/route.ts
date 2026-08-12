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

    // Read API key from server-side env var (never from the client)
    const apiKey = process.env.MISTRAL_API_KEY || process.env.NEXT_PUBLIC_MISTRAL_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OCR API key is not configured on the server. Contact the administrator.' },
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

    // Process the file with OCR
    const result = await OCRService.processImage(file, apiKey, mode as "certificate" | "portal");

    console.log('OCR result:', { success: !result.error, error: result.error, participantsCount: result.participants?.length });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
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
