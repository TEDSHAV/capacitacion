import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(process.env.NODE_ENV === "production" && {
        cookieOptions: {
          domain: ".shadevenezuela.com.ve",
          sameSite: "lax" as const,
          secure: true,
        },
      }),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this is the critical step that allows server
  // components to read an up-to-date session and writes refreshed tokens
  // back to the response cookies so the browser keeps a valid session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect all /dashboard routes; unauthenticated users go to the shell login
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const shellLoginUrl = process.env.NEXT_PUBLIC_SHELL_URL
      ? `${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`
      : new URL("/login", request.url).toString();
    return NextResponse.redirect(shellLoginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on all paths except:
     * - _next/static  (static assets)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - verify-certificate  (public QR verification page)
     * - api           (API routes handle auth themselves)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|verify-certificate|api).*)",
  ],
};
