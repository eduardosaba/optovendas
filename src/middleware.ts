import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type CookieRead = { name: string; value: string };
type CookieWrite = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: "lax" | "strict" | "none" | boolean;
    secure?: boolean;
  };
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // read cookies from the NextRequest
        getAll: async () => {
          try {
            const all = req.cookies.getAll ? req.cookies.getAll() : [];
            return all.map((c) => ({ name: c.name, value: c.value })) as CookieRead[];
          } catch {
            return [];
          }
        },
        // set cookies on the NextResponse
        setAll: async (cookiesToSet: CookieWrite[]) => {
          try {
            cookiesToSet.forEach((c) => {
              // c.options comes from @supabase/ssr cookie options
              // NextResponse.cookies.set accepts a similar shape
              res.cookies.set(c.name, c.value, c.options || {});
            });
          } catch {
            // ignore
          }
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthPage = req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/cadastro";

  async function resolverDestinoPorFuncao(userId: string | undefined) {
    if (!userId) return "/consultorio";
    const perfilRes = await supabase.from("perfis").select("funcao").eq("id", userId).single();
    const perfil = (perfilRes.data ?? null) as { funcao?: string } | null;
    const funcao = (perfil?.funcao ?? "").toLowerCase();

    if (funcao === "master") return "/admin/dashboard";
    if (funcao === "atendente") return "/otica/os";
    return "/consultorio";
  }

  if (session && isAuthPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = await resolverDestinoPorFuncao(user?.id);
    return NextResponse.redirect(redirectUrl);
  }

  const protectedRoute =
    req.nextUrl.pathname.startsWith("/consultorio") ||
    req.nextUrl.pathname.startsWith("/otica") ||
    req.nextUrl.pathname.startsWith("/financeiro") ||
    req.nextUrl.pathname.startsWith("/admin");

  if (!session && protectedRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Se for rota /admin, verificar se o usuario tem funcao master
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const perfilRes = await supabase.from("perfis").select("funcao").eq("id", user?.id).single();
    const perfil = (perfilRes.data ?? null) as { funcao?: string } | null;

    if (!perfil || perfil.funcao !== "master") {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/consultorio";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: ["/login", "/cadastro", "/consultorio/:path*", "/otica/:path*", "/financeiro/:path*", "/admin/:path*"],
};
