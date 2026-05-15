import { ThemeProvider } from "@/components/ui/theme-provider";

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>;
}
