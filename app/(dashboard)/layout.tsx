import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="orbita-shell">
      <Sidebar />
      <main className="orbita-main">{children}</main>
    </div>
  );
}
