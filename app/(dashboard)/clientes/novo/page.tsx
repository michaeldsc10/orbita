// app/(dashboard)/clientes/novo/page.tsx
import { redirect } from "next/navigation";

// Server component — sem "use client", sem JS no browser.
// Constrói a URL do Facebook OAuth e redireciona imediatamente.
// App ID é público (vai na URL de qualquer jeito); secret fica só no route.ts.

export default function ClientesNovoPage() {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  if (!appId || !redirectUri) {
    // Variáveis não configuradas — volta para /clientes com erro
    redirect("/clientes?error=config");
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: "instagram_business_basic,instagram_manage_insights",
    response_type: "code",
  });

  redirect(`https://www.facebook.com/dialog/oauth?${params.toString()}`);
}
