// Reuses the OG image generator pixel-for-pixel. Next.js needs `runtime`
// and the size/alt constants to be statically parseable at the top of
// this file — re-exporting them from another module breaks the build.
// So we declare them as literals here and only re-export the render
// function + generateImageMetadata.
export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "Goality TMC";

export { default, generateImageMetadata } from "./opengraph-image";
