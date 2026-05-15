"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  Megaphone,
  FolderOpen,
  CalendarDays,
  Users,
  FileText,
  Settings,
  Sparkles,
} from "lucide-react";
import { AccountSwitcher } from "@/components/account/AccountSwitcher";

const NAV = [
  {
    section: "Visão Geral",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: BarChart2, badge: "Novo" },
      { label: "Campanhas", href: "/campanhas", icon: Megaphone },
    ],
  },
  {
    section: "Conteúdo",
    items: [
      { label: "Arquivos", href: "/arquivos", icon: FolderOpen },
      { label: "Agenda", href: "/agenda", icon: CalendarDays },
    ],
  },
  {
    section: "Clientes",
    items: [
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Relatórios", href: "/relatorios", icon: FileText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="orbita-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span className="logo-icon">
          <Sparkles size={18} />
        </span>
        <div>
          <p className="logo-name">Orbita</p>
          <p className="logo-sub">ADMIN · INTERNO</p>
        </div>
      </div>

      {/* Account switcher */}
      <div className="sidebar-section">
        <p className="sidebar-label">Conta ativa</p>
        <AccountSwitcher />
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(({ section, items }) => (
          <div key={section} className="sidebar-section">
            <p className="sidebar-label">{section}</p>
            {items.map(({ label, href, icon: Icon, badge }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`nav-item ${active ? "nav-item--active" : ""}`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span>{label}</span>
                  {badge && <span className="nav-badge">{badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <Link href="/configuracoes" className={`nav-item ${pathname === "/configuracoes" ? "nav-item--active" : ""}`}>
          <Settings size={16} strokeWidth={1.75} />
          <span>Configurações</span>
        </Link>
      </div>
    </aside>
  );
}
