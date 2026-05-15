"use client";

import Link from "next/link";
import {
  UserPlus,
  CalendarPlus,
  Upload,
  BarChart2,
  Circle,
  Clock,
  ChevronRight,
  AtSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const QUICK_ACTIONS = [
  {
    label: "Cadastrar cliente",
    desc: "Adicione um novo cliente",
    icon: UserPlus,
    href: "/clientes/novo",
    accent: "#534AB7",
    bg: "#EEEDFE",
  },
  {
    label: "Agendar post",
    desc: "Crie um agendamento",
    icon: CalendarPlus,
    href: "/agenda/novo",
    accent: "#10b981",
    bg: "#ecfdf5",
  },
  {
    label: "Upload de arquivo",
    desc: "Roteiros, vídeos, banners",
    icon: Upload,
    href: "/arquivos/upload",
    accent: "#f59e0b",
    bg: "#fffbeb",
  },
  {
    label: "Ver relatórios",
    desc: "Analise suas métricas",
    icon: BarChart2,
    href: "/relatorios",
    accent: "#6366f1",
    bg: "#eef2ff",
  },
];

const CLIENTS = [
  {
    id: "1",
    name: "Clínica Estética Renova",
    ig: "@clinica.renova",
    connected: true,
    last_sync: "há 2h",
    followers: "12,4k",
    engagement: "4,2%",
    trend: "up",
  },
  {
    id: "2",
    name: "Studio Fotografia MR",
    ig: "@studiomr.foto",
    connected: true,
    last_sync: "há 5h",
    followers: "8,1k",
    engagement: "6,8%",
    trend: "up",
  },
  {
    id: "3",
    name: "Advocacia Torres & Assoc.",
    ig: "@torres.adv",
    connected: false,
    last_sync: "—",
    followers: "3,2k",
    engagement: "2,1%",
    trend: "down",
  },
  {
    id: "4",
    name: "Padaria Artesanal Grão",
    ig: "@padaria.grao",
    connected: true,
    last_sync: "há 1h",
    followers: "22,7k",
    engagement: "7,4%",
    trend: "up",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function HomePage() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const date = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="home-page">
      {/* Header */}
      <div className="home-header">
        <h1 className="home-title">
          {greet} <span>👋</span>
        </h1>
        <p className="home-date">{date}</p>
      </div>

      {/* Quick actions */}
      <section className="home-section">
        <p className="section-label">Ações rápidas</p>
        <div className="quick-grid">
          {QUICK_ACTIONS.map(({ label, desc, icon: Icon, href, accent, bg }) => (
            <Link key={label} href={href} className="quick-card">
              <span className="quick-icon" style={{ background: bg, color: accent }}>
                <Icon size={17} strokeWidth={2} />
              </span>
              <p className="quick-label">{label}</p>
              <p className="quick-desc">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent clients */}
      <section className="home-section">
        <div className="section-header">
          <p className="section-label">Clientes recentes</p>
          <Link href="/clientes" className="section-link">Ver todos</Link>
        </div>

        <div className="clients-table">
          {CLIENTS.map((c) => (
            <Link key={c.id} href={`/clientes/${c.id}`} className="client-row">
              <div className="client-avatar">{initials(c.name)}</div>

              <div className="client-info">
                <p className="client-name">{c.name}</p>
                <span className="client-ig">
                  <AtSign size={10} />
                  {c.ig}
                </span>
              </div>

              <div className="client-meta">
                <div className="meta-col">
                  <span className="meta-label">Seguidores</span>
                  <span className="meta-val">{c.followers}</span>
                </div>
                <div className="meta-col">
                  <span className="meta-label">Engajamento</span>
                  <span
                    className="meta-val"
                    style={{ color: c.trend === "up" ? "#10b981" : "#f87171" }}
                  >
                    {c.trend === "up"
                      ? <TrendingUp size={11} className="inline mr-0.5" />
                      : <TrendingDown size={11} className="inline mr-0.5" />}
                    {c.engagement}
                  </span>
                </div>
                <div className="meta-col">
                  <span className="meta-label">Última sync</span>
                  <span className="meta-val" style={{ color: "var(--muted)" }}>
                    <Clock size={10} className="inline mr-0.5" />
                    {c.last_sync}
                  </span>
                </div>
              </div>

              <div className="client-status">
                <Circle
                  size={7}
                  className={c.connected
                    ? "fill-emerald-500 text-emerald-500"
                    : "fill-rose-400 text-rose-400"}
                />
                <span className="status-text">
                  {c.connected ? "Conectado" : "Desconectado"}
                </span>
              </div>

              <ChevronRight size={14} className="client-arrow" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
