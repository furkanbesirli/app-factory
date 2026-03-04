"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Üret", icon: "🔧" },
  { href: "/apps", label: "Uygulamalar", icon: "📱" },
  { href: "/push", label: "Push Bildirim", icon: "🔔" },
  { href: "/templates", label: "Taslaklar", icon: "📋" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#1565c0] flex flex-col z-50">
      <div className="p-4 border-b border-blue-400/30">
        <h1 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="text-2xl">☰</span>
          Android Builder
        </h1>
      </div>
      <nav className="flex-1 mt-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-800/50 text-white"
                  : "text-blue-100 hover:bg-blue-700/30"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
