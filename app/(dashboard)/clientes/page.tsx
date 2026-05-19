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

// ─── Types ────────────────────────────────────────────────────────────────────

// Firestore salva token_expires_at e connected_at como Timestamp (via new Date() no route.ts)
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
  token_expires_at: number; // ms
  connected_at: number;     // ms
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

function daysLeft(expiresAtMs: number) {
  return Math.floor((expiresAtMs - Date.now()) / 86_400_000);
}

function tokenBadge(account: OrbitaAccount) {
  const d = daysLeft(account.token_expires_at);
  if (d < 0) return { label: "Token expirado", cls: "bg-red-100 text-red-600" };
  if (d <= 7) return { label: `${d}d p/ expirar`, cls: "bg-amber-100 text-amber-600" };
  return { label: `Token válido · ${d}d`, cls: "bg-emerald-100 text-emerald-600" };
}

function relDate(ms: number) {
  const d = Math.floor((Date.now() - ms) / 86_400_000);
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 30) return `${d}d atrás`;
  return `${Math.floor(d / 30)}m atrás`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ account }: { account: OrbitaAccount }) {
  if (account.ig_avatar) {
    return (
      <img
        src={account.ig_avatar}
        alt={account.ig_username}
        className="w-11 h-11 rounded-full object-cover ring-2 ring-[#534AB7]/20 shrink-0"
      />
    );
  }
  return (
    <div className="w-11 h-11 rounded-full bg-[#EEEDFE] flex items-center justify-center ring-2 ring-[#534AB7]/20 shrink-0">
      <span className="text-sm font-semibold text-[#534AB7]">{initials(account.ig_name)}</span>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  account,
  onClose,
  onSave,
}: {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-neutral-900">Editar cliente</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
            <X size={16} className="text-neutral-500" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5 p-3 bg-[#F2F0EB] rounded-xl">
          <Avatar account={account} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">@{account.ig_username}</p>
            <p className="text-xs text-neutral-400">ID: {account.ig_user_id}</p>
          </div>
        </div>

        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Nome de exibição</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/30 focus:border-[#534AB7] transition-all"
        />

        <div className="flex gap-2.5 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#534AB7] text-sm font-medium text-white hover:bg-[#3C3489] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Check size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({
  account,
  onClose,
  onConfirm,
}: {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900 mb-1">Remover cliente</p>
            <p className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-700">@{account.ig_username}</span> será
              desconectado e o token deletado. Ação irreversível.
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {deleting
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Trash2 size={13} />}
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function AccountCard({
  account,
  onEdit,
  onDelete,
  onToggle,
}: {
  account: OrbitaAccount;
  onEdit: (a: OrbitaAccount) => void;
  onDelete: (a: OrbitaAccount) => void;
  onToggle: (a: OrbitaAccount) => void;
}) {
  const [open, setOpen] = useState(false);
  const badge = tokenBadge(account);

  return (
    <div className="relative bg-white border border-neutral-100 rounded-2xl p-5 hover:shadow-md hover:border-[#534AB7]/20 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar account={account} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 truncate">{account.ig_name}</p>
            <p className="text-xs text-neutral-400 flex items-center gap-0.5 mt-0.5">
              <AtSign size={10} />
              {account.ig_username}
            </p>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-neutral-100 transition-all"
          >
            <MoreHorizontal size={15} className="text-neutral-500" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white border border-neutral-100 rounded-xl shadow-xl py-1 w-44">
                <Link
                  href={`/analytics/${account.ig_user_id}`}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-[#EEEDFE] hover:text-[#534AB7] transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <ExternalLink size={13} />
                  Ver analytics
                </Link>
                <button
                  onClick={() => { onEdit(account); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-[#EEEDFE] hover:text-[#534AB7] transition-colors"
                >
                  <Pencil size={13} />
                  Editar nome
                </button>
                <button
                  onClick={() => { onToggle(account); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-[#EEEDFE] hover:text-[#534AB7] transition-colors"
                >
                  {account.active ? <WifiOff size={13} /> : <Wifi size={13} />}
                  {account.active ? "Desativar" : "Ativar"}
                </button>
                <div className="my-1 border-t border-neutral-100" />
                <button
                  onClick={() => { onDelete(account); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                  Remover
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            account.active ? "bg-emerald-100 text-emerald-600" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${account.active ? "bg-emerald-500" : "bg-neutral-400"}`} />
          {account.active ? "Ativo" : "Inativo"}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
        <span className="text-xs text-neutral-400">Conectado {relDate(account.connected_at)}</span>
        <Link
          href={`/analytics/${account.ig_user_id}`}
          className="text-xs font-medium text-[#534AB7] hover:text-[#3C3489] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
        >
          Analytics <ExternalLink size={10} />
        </Link>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error";

interface ToastData {
  type: ToastType;
  message: string;
}

function Toast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const isSuccess = toast.type === "success";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300 ${
        isSuccess ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {isSuccess
        ? <CheckCircle2 size={16} className="shrink-0" />
        : <AlertTriangle size={16} className="shrink-0" />}
      {toast.message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white border border-neutral-100 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-neutral-100 rounded-full shrink-0" />
        <div className="flex-1">
          <div className="h-3.5 bg-neutral-100 rounded w-3/4 mb-2" />
          <div className="h-3 bg-neutral-100 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-1.5 mb-4">
        <div className="h-5 bg-neutral-100 rounded-full w-12" />
        <div className="h-5 bg-neutral-100 rounded-full w-24" />
      </div>
      <div className="pt-3 border-t border-neutral-50">
        <div className="h-3 bg-neutral-100 rounded w-1/3" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Componente isolado só pra ler searchParams — obrigatório para Suspense boundary
function SearchParamsReader({ onToast }: { onToast: (t: ToastData) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "1") {
      onToast({ type: "success", message: "Conta conectada com sucesso!" });
    } else if (error === "oauth_cancelled") {
      onToast({ type: "error", message: "Conexão cancelada pelo usuário." });
    } else if (error === "oauth_failed") {
      onToast({ type: "error", message: "Falha na autenticação — tente novamente." });
    } else if (error === "config") {
      onToast({ type: "error", message: "Configuração incompleta — contate o suporte." });
    }

    if (connected || error) {
      router.replace("/clientes", { scroll: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function ClientesPage() {
  const [accounts, setAccounts] = useState<OrbitaAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<OrbitaAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrbitaAccount | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Auto-dismiss toast após 5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "orbita_accounts"));
        const data = snap.docs.map((d) =>
          toAccount(d.id, d.data() as OrbitaAccountRaw)
        );
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
    ? accounts.filter(
        (a) =>
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
        <EditModal
          account={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveName}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          account={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Clientes</h1>
            {!loading && (
              <p className="text-sm text-neutral-400 mt-0.5">
                {accounts.length} conta{accounts.length !== 1 ? "s" : ""} conectada{accounts.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Link
            href="/clientes/novo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#534AB7] text-white text-sm font-medium rounded-xl hover:bg-[#3C3489] transition-colors shadow-sm shadow-[#534AB7]/20"
          >
            <Plus size={15} />
            Conectar conta
          </Link>
        </div>

        {!loading && accounts.length > 0 && (
          <div className="relative mb-6">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou @username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs pl-9 pr-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#534AB7]/30 focus:border-[#534AB7] bg-white transition-all"
            />
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mb-4">
              <AtSign size={24} className="text-[#534AB7]" />
            </div>
            <p className="font-semibold text-neutral-900 mb-1">Nenhum cliente conectado</p>
            <p className="text-sm text-neutral-400 mb-6 max-w-xs">
              Conecte a primeira conta Instagram para começar.
            </p>
            <Link
              href="/clientes/novo"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#534AB7] text-white text-sm font-medium rounded-xl hover:bg-[#3C3489] transition-colors"
            >
              <Plus size={15} />
              Conectar conta
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search size={20} className="text-neutral-300 mb-2" />
            <p className="text-sm text-neutral-400">Sem resultados para &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
