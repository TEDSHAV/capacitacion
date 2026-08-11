import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkApiRateLimit } from "@/lib/api-rate-limiter";

export async function proxy(request: NextRequest) {
  // ─── API rate limiting (runs before any Supabase overhead) ───
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const pathname = request.nextUrl.pathname;
    let group: "ocr" | "upload" | "citizen" | "default" = "default";
    if (pathname.startsWith("/api/ocr/")) {
      group = "ocr";
    } else if (pathname.startsWith("/api/upload-template") || pathname.startsWith("/api/signatures/upload")) {
      group = "upload";
    } else if (pathname.startsWith("/api/citizen/")) {
      group = "citizen";
    }
    const limited = checkApiRateLimit(request, group);
    if (limited) return limited;
    // API routes handle their own auth — don't run the Supabase session logic
    return NextResponse.next({ request });
  }

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
      cookieOptions: {
        name: "sb-shade-auth-token",
        ...(isProduction &&
          !isLocalhost && {
            domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".shadevenezuela.com.ve",
            sameSite: "lax" as const,
            secure: process.env.NEXT_PUBLIC_COOKIE_SECURE !== "false",
          }),
      },
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
    let userId: string | null = null;
    let userRole: string | null = null;
    let claimsDepartamento: number | null = null;
    try {
      const { data } = await supabase.auth.getClaims();
      userId = data?.claims?.sub ?? null;
      userRole =
        ((data?.claims as Record<string, unknown> | undefined)?.user_role as string) ??
        ((data?.claims?.app_metadata as Record<string, unknown> | undefined)?.role as string) ??
        null;
      const depto = (data?.claims?.app_metadata as Record<string, unknown> | undefined)?.departamento;
      claimsDepartamento = typeof depto === "number" ? depto : null;
    } catch (err: unknown) {
      // If Supabase rate-limits us (429), don't redirect — that triggers a
      // login redirect loop where /login also hits the limit. Allow the
      // request through; the page-level checks will handle it on retry.
      const error = err as { status?: number; code?: string };
      if (error?.status === 429 || error?.code === "over_request_rate_limit") {
        console.warn(
          "Supabase auth rate-limited in proxy; allowing request through",
        );
        return supabaseResponse;
      }
      throw err;
    }

    if (!userId) {
      const loginUrl =
        isProduction && !isLocalhost && process.env.NEXT_PUBLIC_SHELL_URL
          ? `${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`
          : new URL("/login", request.url).toString();
      return NextResponse.redirect(loginUrl);
    }

    // Fast path 1: admin/superadmin from JWT claims — skip all DB queries
    if (userRole === "admin" || userRole === "superadmin") {
      return supabaseResponse;
    }

    // Fast path 2: department from JWT claims (set by Supabase trigger) — skip usuarios query
    if (claimsDepartamento === 3 || claimsDepartamento === 6) {
      return supabaseResponse;
    }

    // Fallback: fetch user data from 'usuarios' table to get user ID and department
    // (needed for users whose JWT doesn't yet contain departamento in app_metadata)
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("id, departamento")
      .eq("id_auth", userId)
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

  // Protect /portal/facilitador routes (except login)
  if (
    request.nextUrl.pathname.startsWith("/portal/facilitador") &&
    !request.nextUrl.pathname.startsWith("/portal/facilitador/login")
  ) {
    const sessionCookie = request.cookies.get("facilitador_session");
    if (!sessionCookie) {
      const loginUrl = new URL("/portal/facilitador/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  // Protect /portal/cliente routes (except login)
  if (
    request.nextUrl.pathname.startsWith("/portal/cliente") &&
    !request.nextUrl.pathname.startsWith("/portal/cliente/login")
  ) {
    const sessionCookie = request.cookies.get("cliente_session");
    if (!sessionCookie) {
      const loginUrl = new URL("/portal/cliente/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
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
     * - survey              (public survey page)
     * - api                 (API routes handle auth themselves)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|verify-certificate|survey|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)",
    // API routes — rate limiting only (auth handled per-route)
    "/api/(.*)",
  ],
};
