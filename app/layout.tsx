import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { ActiveAccountProvider } from "@/context/ActiveAccountContext";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orbita",
  description: "Painel interno de gestão",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-theme="light" className={sora.variable}>
      <body>
        <ActiveAccountProvider>{children}</ActiveAccountProvider>
      </body>
    </html>
  );
}