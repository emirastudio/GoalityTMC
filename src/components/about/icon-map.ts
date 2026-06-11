/**
 * Icon registry for /about pages.
 *
 * Keeps the bundle lean by importing only the icons we actually use in
 * about content. New /about pages should add their icon here.
 */

import {
  Activity,
  Bell,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Flag,
  GitBranch,
  Globe,
  Hotel,
  Layers,
  LayoutDashboard,
  MapPin,
  Package,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const ABOUT_ICONS: Record<string, LucideIcon> = {
  Activity,
  Bell,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Flag,
  GitBranch,
  Globe,
  Hotel,
  Layers,
  LayoutDashboard,
  MapPin,
  Package,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  Zap,
};

export function resolveIcon(name: string): LucideIcon {
  return ABOUT_ICONS[name] ?? Sparkles;
}
