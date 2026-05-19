// app/(dashboard)/clientes/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AtSign,
  Plus,
  Search,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Trash2,
  WifiOff,
  Wifi,
  X,
  Check,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const T = {
  purple: "#534AB7",
  purpleHover: "#3C3489",
  purpleLight: "#EEEDFE",
  cream: "#F2F0EB",
  border: "#E5E3F0",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrbitaAccountRaw {
  uid: string;
  ig_user_id: string;
  ig_username: string;
  ig_name: string;
  ig_avatar?: string;
  access_token: string;
  token_expires_at: Timestamp;
  connected_at: Timestamp;
  active: boolean;
}

interface OrbitaAccount extends Omit<OrbitaAccountRaw, "token_expires_at" | "connected_at"> {
  id: string;
  token_expires_at: number;
  connected_at: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toAccount(id: string, raw: OrbitaAccountRaw): OrbitaAccount {
  return {
    ...raw,
    id,
    token_expires_at: raw.token_expires_at.toMillis(),
    connected_at: raw.connected_at.toMillis(),
  };
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function tokenBadge(expiresAt: number) {
  const d = Math.floor((expiresAt - Date.now()) / 86_400_000);
  if (d < 0) return { label: "Token expirado", color: "#ef4444", bg: "#fee2e2" };
  if (d <= 7) return { label: `${d}d p/ expirar`, color: "#d97706", bg: "#fef3c7" };
  return { label: `Token válido · ${d}d`, color: "#059669", bg: "#d1fae5" };
}

function relDate(ms: number) {
  const d = Math.floor((Date.now() - ms) / 86_400_000);
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 30) return `${d}d atrás`;
  return `${Math.floor(d / 30)}m atrás`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error";
interface ToastData { type: ToastType; message: string; }

function Toast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const ok = toast.type === "success";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 50,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px", borderRadius: 16,
      background: ok ? "#059669" : "#ef4444",
      color: "#fff", fontSize: 14, fontWeight: 500,
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      animation: "slideUp .25s ease",
    }}>
      {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {toast.message}
      <button onClick={onClose} style={{ marginLeft: 8, opacity: 0.75, cursor: "pointer", background: "none", border: "none", color: "#fff", display: "flex" }}>
        <X size={14} />
      </button>
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ─── SearchParams reader ──────────────────────────────────────────────────────

function SearchParamsReader({ onToast }: { onToast: (t: ToastData) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "1") onToast({ type: "success", message: "Conta conectada com sucesso!" });
    else if (error === "oauth_cancelled") onToast({ type: "error", message: "Conexão cancelada pelo usuário." });
    else if (error === "oauth_failed") onToast({ type: "error", message: "Falha na autenticação — tente novamente." });
    else if (error === "config") onToast({ type: "error", message: "Configuração incompleta — contate o suporte." });
    if (connected || error) router.replace("/clientes", { scroll: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ account }: { account: OrbitaAccount }) {
  if (account.ig_avatar) {
    return (
      <img src={account.ig_avatar} alt={account.ig_username}
        style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.purpleLight}`, flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
      background: T.purpleLight, display: "flex", alignItems: "center", justifyContent: "center",
      border: `2px solid ${T.border}`, fontSize: 14, fontWeight: 700, color: T.purple,
    }}>
      {initials(account.ig_name)}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ account, onClose, onSave }: {
  account: OrbitaAccount;
  onClose: () => void;
  onSave: (id: string, name: string) => Promise<void>;
}) {
  const [name, setName] = useState(account.ig_name);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || name === account.ig_name) { onClose(); return; }
    setSaving(true);
    await onSave(account.id, name.trim());
    setSaving(false);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.15)", width: "100%", maxWidth: 380, margin: "0 16px", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>Editar cliente</span>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: "none", background: "none", cursor: "pointer", color: "#666", display: "flex" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: T.cream, borderRadius: 14, marginBottom: 20 }}>
          <Avatar account={account} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>@{account.ig_username}</p>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>ID: {account.ig_user_id}</p>
          </div>
        </div>

        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          Nome de exibição
        </label>
        <input
          autoFocus type="text" value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          onFocus={(e) => (e.target.style.borderColor = T.purple)}
          onBlur={(e) => (e.target.style.borderColor = T.border)}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 50, border: `1.5px solid ${T.border}`, background: "none", fontSize: 14, fontWeight: 500, color: "#555", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={saving || !name.trim()} style={{ flex: 1, padding: "11px 0", borderRadius: 50, border: "none", background: T.purple, fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: saving || !name.trim() ? 0.5 : 1 }}>
            {saving ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .6s linear infinite", display: "inline-block" }} /> : <Check size={14} />}
            Salvar
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ account, onClose, onConfirm }: {
  account: OrbitaAccount;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  async function submit() {
    setDeleting(true);
    await onConfirm(account.id);
    setDeleting(false);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.15)", width: "100%", maxWidth: 360, margin: "0 16px", padding: 24 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={16} color="#ef4444" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 4 }}>Remover cliente</p>
            <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>
              <strong style={{ color: "#333" }}>@{account.ig_username}</strong> será desconectado e o token deletado. Ação irreversível.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 50, border: `1.5px solid ${T.border}`, background: "none", fontSize: 14, fontWeight: 500, color: "#555", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={deleting} style={{ flex: 1, padding: "11px 0", borderRadius: 50, border: "none", background: "#ef4444", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: deleting ? 0.5 : 1 }}>
            {deleting ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .6s linear infinite", display: "inline-block" }} /> : <Trash2 size={13} />}
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Menu Item ───────────────────────────────────────────────────────────

function MenuItem({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
        border: "none", background: hover ? (danger ? "#fee2e2" : T.purpleLight) : "none",
        color: danger ? "#ef4444" : hover ? T.purple : "#444",
        fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "background .15s, color .15s",
      }}
    >
      {icon}{label}
    </button>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({ account, onEdit, onDelete, onToggle }: {
  account: OrbitaAccount;
  onEdit: (a: OrbitaAccount) => void;
  onDelete: (a: OrbitaAccount) => void;
  onToggle: (a: OrbitaAccount) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const badge = tokenBadge(account.token_expires_at);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", background: "#fff",
        border: `1.5px solid ${hover ? T.border : "#ebebeb"}`,
        borderRadius: 20, padding: 20,
        boxShadow: hover ? "0 8px 24px rgba(83,74,183,0.10)" : "0 1px 4px rgba(0,0,0,0.04)",
        transition: "box-shadow .2s, border-color .2s",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Avatar account={account} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.ig_name}</p>
            <p style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
              <AtSign size={10} />{account.ig_username}
            </p>
          </div>
        </div>

        {/* Kebab */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              padding: 6, borderRadius: 8, border: "none", background: open ? T.purpleLight : "none",
              cursor: "pointer", color: "#888", display: "flex",
              opacity: hover || open ? 1 : 0, transition: "opacity .15s",
            }}
          >
            <MoreHorizontal size={15} />
          </button>

          {open && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
              <div style={{
                position: "absolute", right: 0, top: 34, zIndex: 20,
                background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: 170,
              }}>
                <Link href={`/analytics/${account.ig_user_id}`} onClick={() => setOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", fontSize: 13, fontWeight: 500, color: "#444", textDecoration: "none" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.purpleLight; (e.currentTarget as HTMLElement).style.color = T.purple; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "#444"; }}
                >
                  <ExternalLink size={13} />Ver analytics
                </Link>
                <MenuItem icon={<Pencil size={13} />} label="Editar nome" onClick={() => { onEdit(account); setOpen(false); }} />
                <MenuItem icon={account.active ? <WifiOff size={13} /> : <Wifi size={13} />} label={account.active ? "Desativar" : "Ativar"} onClick={() => { onToggle(account); setOpen(false); }} />
                <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                <MenuItem icon={<Trash2 size={13} />} label="Remover" danger onClick={() => { onDelete(account); setOpen(false); }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50, background: account.active ? "#d1fae5" : "#f3f4f6", color: account.active ? "#059669" : "#6b7280" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: account.active ? "#10b981" : "#9ca3af" }} />
          {account.active ? "Ativo" : "Inativo"}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50, background: badge.bg, color: badge.color }}>
          {badge.label}
        </span>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid #f0f0f0` }}>
        <span style={{ fontSize: 11, color: "#aaa" }}>Conectado {relDate(account.connected_at)}</span>
        <Link href={`/analytics/${account.ig_user_id}`}
          style={{ fontSize: 11, fontWeight: 600, color: T.purple, display: "flex", alignItems: "center", gap: 4, textDecoration: "none", opacity: hover ? 1 : 0, transition: "opacity .15s" }}
        >
          Analytics <ExternalLink size={10} />
        </Link>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #ebebeb", borderRadius: 20, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0f0f0", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 13, background: "#f0f0f0", borderRadius: 6, width: "70%", marginBottom: 8 }} />
          <div style={{ height: 11, background: "#f0f0f0", borderRadius: 6, width: "45%" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <div style={{ height: 20, background: "#f0f0f0", borderRadius: 50, width: 52 }} />
        <div style={{ height: 20, background: "#f0f0f0", borderRadius: 50, width: 100 }} />
      </div>
      <div style={{ paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
        <div style={{ height: 11, background: "#f0f0f0", borderRadius: 6, width: "35%" }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [accounts, setAccounts] = useState<OrbitaAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<OrbitaAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrbitaAccount | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [searchFocus, setSearchFocus] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "orbita_accounts"));
        const data = snap.docs.map((d) => toAccount(d.id, d.data() as OrbitaAccountRaw));
        data.sort((a, b) => b.connected_at - a.connected_at);
        setAccounts(data);
      } catch (err) {
        console.error("Erro ao carregar orbita_accounts:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDelete(id: string) {
    await deleteDoc(doc(db, "orbita_accounts", id));
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSaveName(id: string, name: string) {
    await updateDoc(doc(db, "orbita_accounts", id), { ig_name: name });
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ig_name: name } : a)));
  }

  async function handleToggle(account: OrbitaAccount) {
    const next = !account.active;
    await updateDoc(doc(db, "orbita_accounts", account.id), { active: next });
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, active: next } : a)));
  }

  const filtered = search.trim()
    ? accounts.filter((a) =>
        a.ig_name.toLowerCase().includes(search.toLowerCase()) ||
        a.ig_username.toLowerCase().includes(search.toLowerCase())
      )
    : accounts;

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsReader onToast={setToast} />
      </Suspense>

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {editTarget && (
        <EditModal account={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveName} />
      )}
      {deleteTarget && (
        <DeleteModal account={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}

      <div style={{ padding: 32, maxWidth: 1152, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111", letterSpacing: "-0.03em", margin: 0 }}>Clientes</h1>
            {!loading && (
              <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>
                {accounts.length} conta{accounts.length !== 1 ? "s" : ""} conectada{accounts.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Link href="/clientes/novo" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "11px 20px", borderRadius: 50,
            background: T.purple, color: "#fff",
            fontSize: 14, fontWeight: 600, textDecoration: "none",
            boxShadow: `0 4px 16px rgba(83,74,183,0.25)`,
            transition: "background .15s",
          }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = T.purpleHover)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = T.purple)}
          >
            <Plus size={15} />
            Conectar conta
          </Link>
        </div>

        {/* Search */}
        {!loading && accounts.length > 0 && (
          <div style={{ position: "relative", marginBottom: 24, maxWidth: 280 }}>
            <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Buscar por nome ou @username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              style={{
                width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10,
                fontSize: 13, border: `1.5px solid ${searchFocus ? T.purple : T.border}`,
                borderRadius: 50, outline: "none", background: "#fff",
                color: "#111", boxSizing: "border-box", fontFamily: "inherit",
                boxShadow: searchFocus ? `0 0 0 3px rgba(83,74,183,0.12)` : "none",
                transition: "border-color .15s, box-shadow .15s",
              }}
            />
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: T.purpleLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <AtSign size={28} color={T.purple} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 6 }}>Nenhum cliente conectado</p>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 24, maxWidth: 280, lineHeight: 1.6 }}>
              Conecte a primeira conta Instagram para começar a gerenciar clientes.
            </p>
            <Link href="/clientes/novo" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "11px 24px", borderRadius: 50,
              background: T.purple, color: "#fff",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
              boxShadow: `0 4px 16px rgba(83,74,183,0.25)`,
            }}>
              <Plus size={15} />
              Conectar conta
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", textAlign: "center" }}>
            <Search size={20} color="#ccc" style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: "#999" }}>Sem resultados para &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
            {filtered.map((a) => (
              <AccountCard key={a.id} account={a} onEdit={setEditTarget} onDelete={setDeleteTarget} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
