import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Android Builder",
  description: "Android APK/AAB Builder Panel",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="flex min-h-screen bg-[#121212]">
        <Sidebar />
        <main className="flex-1 ml-56 p-6">{children}</main>
      </body>
    </html>
  );
}
