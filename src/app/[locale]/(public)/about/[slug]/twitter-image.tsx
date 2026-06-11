// Re-uses the same generator as opengraph-image so Twitter cards match
// the OG card pixel-for-pixel. Next.js requires the file convention to
// live next to the route, so we re-export rather than symlink.
export {
  default,
  contentType,
  size,
  alt,
  runtime,
  generateImageMetadata,
} from "./opengraph-image";
