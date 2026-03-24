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

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  try {

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          try {
            const all = req.cookies.getAll ? req.cookies.getAll() : [];
            return all.map((c) => ({ name: c.name, value: c.value })) as CookieRead[];
          } catch {
            return [];
          }
        },
        setAll: (cookiesToSet: CookieWrite[]) => {
          try {
            cookiesToSet.forEach((c) => {
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

  function normalizarFuncao(funcaoRaw?: string) {
    const f = (funcaoRaw ?? "").toLowerCase();
    if (f === "master") return "master";
    if (f === "admin" || f === "admin_clinica") return "admin";
    if (f === "consultorio" || f === "optometrista") return "consultorio";
    if (f === "vendas" || f === "atendente") return "vendas";
    if (f === "financeiro") return "financeiro";
    return "consultorio";
  }

  async function resolverDestinoPorFuncao(userId: string | undefined) {
    if (!userId) return "/login";
    try {
      const perfilRes = await supabase.from("perfis").select("funcao").eq("id", userId).maybeSingle();
      const perfil = (perfilRes.data ?? null) as { funcao?: string } | null;
      const funcao = (perfil?.funcao ?? "").toLowerCase();

      if (funcao === "master") return "/admin";
      if (funcao === "admin" || funcao === "admin_clinica") return "/consultorio";
      if (funcao === "financeiro") return "/financeiro";
      if (funcao === "atendente" || funcao === "vendas") return "/otica";
      return "/consultorio";
    } catch {
      return "/consultorio";
    }
  }

  if (session && isAuthPage) {
    const user = session.user;
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = await resolverDestinoPorFuncao(user?.id);
    return NextResponse.redirect(redirectUrl);
  }

  if (req.nextUrl.pathname === "/") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/vendas";
    return NextResponse.redirect(redirectUrl);
  }

  const protectedRoute =
    req.nextUrl.pathname.startsWith("/perfil") ||
    req.nextUrl.pathname.startsWith("/consultorio") ||
    req.nextUrl.pathname.startsWith("/otica") ||
    req.nextUrl.pathname.startsWith("/financeiro") ||
    req.nextUrl.pathname.startsWith("/comunicacao") ||
    req.nextUrl.pathname.startsWith("/admin");

  // Nao bloqueia no servidor quando nao ha sessao em cookie.
  // O controle fino ocorre no cliente (dashboard layout), evitando loop
  // de redirecionamento apos login client-side.

  // NOTE:
  // Em alguns fluxos de login client-side, a sessao pode existir no navegador
  // antes de ser refletida nos cookies do servidor. Nesses casos, bloquear aqui
  // causava loop "login com sucesso" -> "/login".
  // Deixamos o bloqueio fino para o cliente e para os casos com sessao server.

  if (session && protectedRoute) {
    const user = session.user;
    const pathname = req.nextUrl.pathname;

    const perfilRes = await supabase.from("perfis").select("funcao").eq("id", user?.id).maybeSingle();
    const perfil = (perfilRes.data ?? null) as { funcao?: string } | null;
    const role = normalizarFuncao(perfil?.funcao);

    const permitidoConsultorio = role === "master" || role === "admin" || role === "consultorio";
    const permitidoOtica = role === "master" || role === "admin" || role === "vendas";
    const permitidoFinanceiro = role === "master" || role === "admin" || role === "financeiro";
    const permitidoComunicacao = role === "master" || role === "admin" || role === "consultorio" || role === "vendas";

    if (pathname.startsWith("/consultorio") && !permitidoConsultorio) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = role === "financeiro" ? "/financeiro" : "/otica";
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/otica") && !permitidoOtica) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = role === "financeiro" ? "/financeiro" : "/consultorio";
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/financeiro") && !permitidoFinanceiro) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = role === "vendas" ? "/otica" : "/consultorio";
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/comunicacao") && !permitidoComunicacao) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = role === "financeiro" ? "/financeiro" : "/consultorio";
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/admin/equipe") && !(role === "master" || role === "admin")) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/consultorio";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (session && req.nextUrl.pathname.startsWith("/admin") && !req.nextUrl.pathname.startsWith("/admin/equipe")) {
    const user = session?.user;

    const perfilRes = await supabase.from("perfis").select("funcao").eq("id", user?.id).maybeSingle();
    const perfil = (perfilRes.data ?? null) as { funcao?: string } | null;

    if (!perfil || perfil.funcao !== "master") {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/consultorio";
      return NextResponse.redirect(redirectUrl);
    }
  }

    return res;
  } catch {
    // Em caso de erro inesperado no guard, evita tela 500 na rota de autenticacao.
    if (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/cadastro") {
      return res;
    }

    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: ["/", "/login", "/cadastro", "/perfil", "/consultorio/:path*", "/otica/:path*", "/financeiro/:path*", "/comunicacao/:path*", "/admin/:path*"],
};
