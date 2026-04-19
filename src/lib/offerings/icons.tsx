/**
 * Curated icon set for offerings. Stored in the DB as a string key
 * (e.g. "hotel"), rendered as a Lucide line icon. Keeping the list
 * finite means:
 *   - no user-submitted emojis that render inconsistently cross-OS
 *   - predictable visual language across catalog / packages / deals
 *   - trivial to render in any surface (organizer, club, receipt PDF)
 */

import {
  Hotel, Utensils, Bus, Ticket, Medal, Coffee, Car, Plane, MapPin,
  Calendar, Shield, Star, CreditCard, FileText, Shirt, Music, Camera,
  Gift, Trophy, Users, Tag, Package as PackageIcon, Briefcase,
  GraduationCap, ShoppingBag, Wifi, KeyRound, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const OFFERING_ICONS: { key: string; Icon: LucideIcon; label: string }[] = [
  { key: "hotel",        Icon: Hotel,          label: "Hotel" },
  { key: "meal",         Icon: Utensils,       label: "Meal" },
  { key: "bus",          Icon: Bus,            label: "Bus" },
  { key: "car",          Icon: Car,            label: "Car" },
  { key: "plane",        Icon: Plane,          label: "Plane" },
  { key: "coffee",       Icon: Coffee,         label: "Coffee" },
  { key: "ticket",       Icon: Ticket,         label: "Ticket" },
  { key: "medal",        Icon: Medal,          label: "Medal" },
  { key: "trophy",       Icon: Trophy,         label: "Trophy" },
  { key: "star",         Icon: Star,           label: "Star" },
  { key: "shield",       Icon: Shield,         label: "Shield" },
  { key: "map",          Icon: MapPin,         label: "Location" },
  { key: "calendar",     Icon: Calendar,       label: "Calendar" },
  { key: "fee",          Icon: CreditCard,     label: "Fee" },
  { key: "document",     Icon: FileText,       label: "Document" },
  { key: "shirt",        Icon: Shirt,          label: "Jersey" },
  { key: "music",        Icon: Music,          label: "Music" },
  { key: "camera",       Icon: Camera,         label: "Photo" },
  { key: "gift",         Icon: Gift,           label: "Gift" },
  { key: "team",         Icon: Users,          label: "Team" },
  { key: "tag",          Icon: Tag,            label: "Tag" },
  { key: "package",      Icon: PackageIcon,    label: "Package" },
  { key: "briefcase",    Icon: Briefcase,      label: "Staff" },
  { key: "graduation",   Icon: GraduationCap,  label: "Academy" },
  { key: "bag",          Icon: ShoppingBag,    label: "Bag" },
  { key: "wifi",         Icon: Wifi,           label: "Wi-Fi" },
  { key: "key",          Icon: KeyRound,       label: "Key" },
  { key: "sparkles",     Icon: Sparkles,       label: "Extra" },
];

const ICON_MAP = new Map(OFFERING_ICONS.map(i => [i.key, i.Icon]));

/** Resolve an icon key to a Lucide component. Falls back to Sparkles. */
export function getOfferingIcon(
  key: string | null | undefined,
  fallback: LucideIcon = Sparkles
): LucideIcon {
  if (!key) return fallback;
  return ICON_MAP.get(key) ?? fallback;
}

/** React helper — render an icon by key with default styling. */
export function OfferingIcon({
  iconKey,
  size = 16,
  className,
  color,
  fallback,
}: {
  iconKey: string | null | undefined;
  size?: number;
  className?: string;
  color?: string;
  fallback?: LucideIcon;
}) {
  const Icon = getOfferingIcon(iconKey, fallback);
  return <Icon size={size} className={className} color={color} />;
}
