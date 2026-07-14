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

  // Protect all /dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!user) {
      const isProduction = process.env.NODE_ENV === "production";
      const loginUrl =
        isProduction && process.env.NEXT_PUBLIC_SHELL_URL
          ? `${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`
          : new URL("/login", request.url).toString();
      return NextResponse.redirect(loginUrl);
    }

    // Check if user belongs to 'capacitacion' department (id: 3)
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("id, departamento")
      .eq("id_auth", user.id)
      .single();

    if (userError || !userData) {
      return redirectToUnauthorized(request);
    }

    // Rule 1: Allow access if in 'capacitacion' department (id: 3)
    if (userData.departamento === 3) {
      return supabaseResponse;
    }

    // Rule 2: Allow access if user is admin (6) or superadmin (5)
    // First, try to check if they have a global role in metadata
    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    if (userRole === 'superadmin' || userRole === 'admin') {
      return supabaseResponse;
    }

    // Rule 3: Check roles in authprisma via a Security Definer function
    // This is the proper solution to avoid schema permission issues
    try {
      const { data: isAdmin } = await supabase
        .rpc('is_app_admin', { 
          target_user_id: userData.id, 
          target_app_id: 2 
        });

      if (isAdmin) {
        return supabaseResponse;
      }
    } catch (e) {
      // Gracefully handle RPC errors
    }

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
    "/((?!_next/static|_next/image|favicon\\.ico|verify-certificate|api).*)",
  ],
};
