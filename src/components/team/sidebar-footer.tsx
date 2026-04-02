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
    <div className="px-4 py-4 shrink-0 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 rounded-lg p-0.5 bg-gray-50">
          {locales.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => router.replace(pathname, { locale: code })}
              className="px-2 py-1 text-[10px] font-semibold rounded-md hover:bg-gray-200 transition-colors cursor-pointer text-gray-500"
            >
              {label}
            </button>
          ))}
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors text-gray-500"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
