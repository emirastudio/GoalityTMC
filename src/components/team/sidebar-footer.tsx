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
    <div className="px-4 py-4 shrink-0 border-t th-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 rounded-lg p-0.5 th-bg border th-border">
          {locales.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => router.replace(pathname, { locale: code })}
              className="px-2 py-1 text-[10px] font-semibold rounded-md hover:opacity-80 transition-colors cursor-pointer th-text-2"
            >
              {label}
            </button>
          ))}
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-8 h-8 rounded-lg hover:opacity-80 flex items-center justify-center cursor-pointer transition-colors th-text-2"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
