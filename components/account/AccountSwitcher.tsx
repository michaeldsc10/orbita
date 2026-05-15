"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveAccount } from "@/context/ActiveAccountContext";
import { ChevronsUpDown, Plus, Circle } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SCOPES = "instagram_basic,instagram_manage_insights,pages_show_list";

function buildOAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI!,
    scope: SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
}

interface Account {
  id: string;
  ig_name: string;
  ig_username: string;
  ig_avatar: string;
  active: boolean;
  token_expires_at: { toDate: () => Date };
}

export function AccountSwitcher() {
  const { account, setAccount } = useActiveAccount();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    async function fetchAccounts() {
      const uid = "admin"; // trocar por currentUser.uid quando auth ativo
      const q = query(
        collection(db, "orbita_accounts"),
        where("uid", "==", uid),
        where("active", "==", true)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Account));
      setAccounts(data);
      if (!account && data.length > 0) setAccount(data[0] as any);
    }
    fetchAccounts();
  }, []);

  function isTokenValid(acc: Account) {
    try { return acc.token_expires_at.toDate() > new Date(); }
    catch { return false; }
  }

  const initials = account?.ig_name
    ? account.ig_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "—";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} className="account-switcher">
        <div className="account-initials">{initials}</div>
        <span className="account-name">{account?.ig_name ?? "Selecionar conta"}</span>
        {account && <span className="account-dot" />}
        <ChevronsUpDown size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
      </button>

      {open && (
        <div className="account-dropdown">
          {accounts.length === 0 && (
            <p className="dropdown-empty">Nenhuma conta conectada</p>
          )}

          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => { setAccount(acc as any); setOpen(false); }}
              className={`dropdown-item ${account?.id === acc.id ? "dropdown-item--active" : ""}`}
            >
              <div className="account-initials" style={{ width: 28, height: 28, fontSize: 10 }}>
                {acc.ig_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="dropdown-name">{acc.ig_name}</p>
                <p className="dropdown-ig">{acc.ig_username}</p>
              </div>
              <Circle
                size={7}
                style={{
                  color: isTokenValid(acc) ? "#10b981" : "#f87171",
                  fill: isTokenValid(acc) ? "#10b981" : "#f87171",
                  flexShrink: 0,
                }}
              />
            </button>
          ))}

          <div className="dropdown-divider" />

          <a href={buildOAuthUrl()} className="dropdown-item dropdown-add">
            <Plus size={13} />
            <span>Adicionar conta</span>
          </a>
        </div>
      )}
    </div>
  );
}
