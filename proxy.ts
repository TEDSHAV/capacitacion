import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
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
    let user: any = null;
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
    } catch (err: any) {
      // If Supabase rate-limits us (429), don't redirect — that triggers a
      // login redirect loop where /login also hits the limit. Allow the
      // request through; the page-level checks will handle it on retry.
      if (err?.status === 429 || err?.code === "over_request_rate_limit") {
        console.warn(
          "Supabase auth rate-limited in proxy; allowing request through",
        );
        return supabaseResponse;
      }
      throw err;
    }

    if (!user) {
      const loginUrl =
        isProduction && !isLocalhost && process.env.NEXT_PUBLIC_SHELL_URL
          ? `${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`
          : new URL("/login", request.url).toString();
      return NextResponse.redirect(loginUrl);
    }

    // Fetch user data from 'usuarios' table to get user ID and department
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("id, departamento")
      .eq("id_auth", user.id)
      .single();

    if (userError || !userData) {
      return redirectToUnauthorized(request);
    }

    // Rule 1: Allow access if user belongs to 'capacitacion' department (id: 3) or 'TED' department (id: 6)
    // Check department first to avoid RPC call for most users
    if (userData.departamento === 3 || userData.departamento === 6) {
      return supabaseResponse;
    }

    // Rule 2: Allow access if user is admin or superadmin for this app
    // Only call RPC if department check failed (to minimize rate limit hits)
    const { data: userRoles, error: rolesError } = await supabase.rpc(
      "get_user_roles_by_app",
      { p_usuario_id: userData.id },
    );

    if (!rolesError && userRoles) {
      const roles = userRoles as Array<{ app_slug: string; role_slug: string }>;
      // Check if user has admin or superadmin role for scapacitacion app
      const hasAdminRole = roles.some(
        (r) =>
          r.app_slug === "scapacitacion" &&
          (r.role_slug === "admin" || r.role_slug === "superadmin"),
      );
      if (hasAdminRole) {
        return supabaseResponse;
      }
    }

    // Default: Redirect to unauthorized for everyone else
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
