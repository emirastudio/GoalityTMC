"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { LogOut } from "lucide-react";

const locales = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "et", label: "ET" },
];

export function SidebarFooter() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="px-4 py-4 border-t border-white/6 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
          {locales.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => router.replace(pathname, { locale: code })}
              className="px-2 py-1 text-[10px] font-semibold rounded-md text-white/35 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-8 h-8 rounded-lg hover:bg-white/8 flex items-center justify-center cursor-pointer text-white/30 hover:text-white/60 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
