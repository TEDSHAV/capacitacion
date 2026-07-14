import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const isProduction = process.env.NODE_ENV === "production";
  const isLocalhost =
    request.nextUrl.hostname === "localhost" ||
    request.nextUrl.hostname === "127.0.0.1";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(isProduction &&
        !isLocalhost && {
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
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session — this is the critical step that allows server
  // components to read an up-to-date session and writes refreshed tokens
  // back to the response cookies so the browser keeps a valid session.

  // Protect all /dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl =
        isProduction && !isLocalhost && process.env.NEXT_PUBLIC_SHELL_URL
          ? `${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`
          : new URL("/login", request.url).toString();
      return NextResponse.redirect(loginUrl);
    }

    // Rule 1: Always allow Global Admins and Superadmins
    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    if (userRole === "superadmin" || userRole === "admin") {
      return supabaseResponse;
    }

    // Rule 2: Always allow specific authorized email (Lider de Negocios)
    if (user.email === "lidernegocios@shadevenezuela.com.ve") {
      return supabaseResponse;
    }

    // Fetch user data from 'usuarios' table for department-based checks
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("id, departamento")
      .eq("id_auth", user.id)
      .single();

    if (userError || !userData) {
      return redirectToUnauthorized(request);
    }

    // Rule 3: Allow access if user belongs to 'capacitacion' department (id: 3)
    if (userData.departamento === 3) {
      return supabaseResponse;
    }

    // Default: Redirect to unauthorized for everyone else
    // This includes staff from 'negocios' (dept 2) who are not global admins
    return redirectToUnauthorized(request);
  }

  return supabaseResponse;
}

// Helper to redirect to unauthorized page
function redirectToUnauthorized(request: NextRequest) {
  // Always use the local unauthorized page we created in this module
  const unauthorizedUrl = new URL("/unauthorized", request.url);
  return NextResponse.redirect(unauthorizedUrl);
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
    "/((?!_next/static|_next/image|favicon\\.ico|verify-certificate|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
  ],
};
