import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const APP_ID = process.env.FACEBOOK_APP_ID!;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI!;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=oauth_cancelled", req.url));
  }

  try {
    // 1. Troca code por short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: APP_ID,
          client_secret: APP_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        })
    );

    if (!tokenRes.ok) throw new Error("Falha ao obter short-lived token");
    const { access_token: shortToken } = await tokenRes.json();

    // 2. Troca por long-lived token (60 dias)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: APP_ID,
          client_secret: APP_SECRET,
          fb_exchange_token: shortToken,
        })
    );

    if (!longRes.ok) throw new Error("Falha ao obter long-lived token");
    const { access_token: longToken, expires_in } = await longRes.json();

    // 3. Busca dados da conta Instagram
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/me?` +
        new URLSearchParams({
          fields: "id,name,username,profile_picture_url",
          access_token: longToken,
        })
    );

    if (!igRes.ok) throw new Error("Falha ao buscar dados do Instagram");
    const ig = await igRes.json();

    // 4. Salva em orbita_accounts
    // uid fixo por ora (sem auth) — trocar por uid real quando auth estiver ativo
    const uid = "admin";

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    await adminDb.collection("orbita_accounts").doc(ig.id).set({
      uid,
      ig_user_id: ig.id,
      ig_username: ig.username ?? "",
      ig_name: ig.name ?? "",
      ig_avatar: ig.profile_picture_url ?? "",
      access_token: longToken, // ← criptografar com AES na Fase 6
      token_expires_at: tokenExpiresAt,
      connected_at: new Date(),
      active: true,
    });

    return NextResponse.redirect(new URL("/clientes?connected=1", req.url));
  } catch (err) {
    console.error("[instagram/callback]", err);
    return NextResponse.redirect(new URL("/?error=oauth_failed", req.url));
  }
}
