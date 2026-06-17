// Reuses the OG image generator pixel-for-pixel. See twitter-image.tsx
// at /about/ — same reason for the inline constants instead of re-exports.
export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "Goality TMC";

export { default, generateImageMetadata } from "./opengraph-image";
