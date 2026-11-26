import { Image } from 'expo-image';
import { PixelRatio } from 'react-native';

/**
 * Cloudinary serves every image at up to 1080px wide (w_1080 in the URL). Thumbnails don't need that:
 * ask for a size that matches how big the image is shown, so it downloads several times faster.
 * Fixed size steps keep URLs stable, so a prefetched image is exactly the one later displayed (cache hit).
 */
const SIZES = { sm: 400, md: 720, lg: 1080 };
const dpr = Math.min(PixelRatio.get() || 1, 3);

export function sized(uri, size = 'md') {
  if (!uri || typeof uri !== 'string' || !uri.includes('res.cloudinary.com') || !uri.includes('w_1080')) return uri;
  const px = Math.min(1080, Math.round((SIZES[size] || SIZES.md) * (dpr > 2 ? 1.5 : dpr > 1 ? 1.25 : 1) / 40) * 40);
  return uri.replace('w_1080', `w_${px}`);
}

const done = new Set();

/** Download images in the background into the memory + disk cache so they show instantly later. */
export function prefetchImages(uris, size = 'md') {
  const list = [...new Set((uris || []).filter(Boolean).map((u) => sized(u, size)))].filter((u) => !done.has(u));
  if (!list.length) return;
  list.forEach((u) => done.add(u));
  Image.prefetch(list, 'memory-disk').catch(() => list.forEach((u) => done.delete(u)));
}
