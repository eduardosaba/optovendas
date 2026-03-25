This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Variáveis de ambiente

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env.local
```


Segurança e configuração

- Desenvolvimento (configuração rápida): a UI de admin anteriormente lia `NEXT_PUBLIC_INTERNAL_API_KEY` do cliente e a passava para o servidor. Isso é conveniente para o desenvolvimento local, mas expõe a chave ao navegador e NÃO deve ser usado em produção.

- Recomendado (implementado): o cliente agora envia o token da sessão atual do Supabase (`Authorization: Bearer <token>`). O servidor valida o token e verifica o `perfis.funcao` do chamador para permitir apenas `master` / `admin` / `admin_clinica` para criar usuários. Para trabalhos entre servidores, você ainda pode usar um `INTERNAL_API_KEY` apenas para servidor.

Como configurar localmente

1. Crie `.env.local` na raiz do projeto com pelo menos:

```
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
INTERNAL_API_KEY=<some-random-secret> # opcional, para uso entre servidores
```

2. Reinicie o servidor de desenvolvimento: `pnpm dev` ou `npm run dev`.

Nota de segurança: nunca comite `SUPABASE_SERVICE_ROLE_KEY` ou `INTERNAL_API_KEY` no controle de versão. Em produção, armazene esses em um armazenamento secreto da sua plataforma e não exponha `INTERNAL_API_KEY` como `NEXT_PUBLIC_...`.

Exemplo de uso no frontend:

```ts
await fetch('/api/admin/create-user', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'x-internal-key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? '',
	},
	body: JSON.stringify(payload),
});
```

Importante de segurança:

- Toda variável `NEXT_PUBLIC_*` fica visível no navegador.
- Para produção, o ideal é mover chamadas sensíveis para camada server-only e validar sessão/perfil no backend (RLS + RBAC), sem depender de segredo exposto no client.

## Diagnóstico de hydration mismatch (`data-qb-installed`)

Se aparecer erro de hidratação com `data-qb-installed` no elemento `html`:

1. O projeto não possui essa attribute no código-fonte (`src`/`public`).
2. A causa mais comum é extensão de navegador injetando atributo antes do React hidratar.
3. Teste em aba anônima ou com extensões desativadas.
4. Limpe cache do Next e reinicie o servidor dev:

```bash
rm -rf .next
pnpm run dev
```

No Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .next
pnpm run dev
```
