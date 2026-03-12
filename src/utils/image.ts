import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { Image } from "imagescript";
import fetch from "node-fetch";

export async function fetchImage(src: string): Promise<Image | undefined> {
  try {
    let imageBuffer: Buffer | Uint8Array;

    if (src.startsWith("http")) {
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      imageBuffer = await readFile(src);
    }

    try {
      return (await Image.decode(imageBuffer)) as Image;
    } catch (_) {
      // If initial decode fails, try to "patch" the buffer for common formats
      const patchedBuffer = patchPartialBuffer(imageBuffer);
      return (await Image.decode(patchedBuffer)) as Image;
    }
  } catch {
    return undefined;
  }
}

/**
 * Attempts to append EOF markers to common image types
 * to satisfy decoders on truncated data.
 */
function patchPartialBuffer(buffer: Buffer | Uint8Array): Uint8Array {
  const u8 = new Uint8Array(buffer);

  // JPEG: Starts with FF D8. Ends with FF D9.
  if (u8[0] === 0xff && u8[1] === 0xd8) {
    const eoi = new Uint8Array([0xff, 0xd9]);
    const patched = new Uint8Array(u8.length + 2);
    patched.set(u8);
    patched.set(eoi, u8.length);
    return patched;
  }

  // PNG: Ends with IEND chunk: 00 00 00 00 49 45 4E 44 AE 42 60 82
  if (u8[0] === 0x89 && u8[1] === 0x50) {
    const iend = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    const patched = new Uint8Array(u8.length + iend.length);
    patched.set(u8);
    patched.set(iend, u8.length);
    return patched;
  }

  return u8;
}

export function calculateImageSize({
  maxWidth,
  maxHeight,
  originalAspectRatio,
  specifiedWidth,
  specifiedHeight,
}: {
  maxWidth: number;
  maxHeight: number;
  originalAspectRatio: number;
  specifiedWidth?: number;
  specifiedHeight?: number;
}): { width: number; height: number } {
  // Both width and height specified
  if (specifiedWidth && specifiedHeight) {
    const width = Math.min(specifiedWidth, maxWidth);
    const height = Math.min(specifiedHeight, maxHeight);
    return { width: Math.round(width), height: Math.round(height) };
  }

  // Only width specified
  if (specifiedWidth) {
    let width = Math.min(specifiedWidth, maxWidth);
    let height = width / originalAspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * originalAspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  // Only height specified
  if (specifiedHeight) {
    let height = Math.min(specifiedHeight, maxHeight);
    let width = height * originalAspectRatio;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / originalAspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  // No dimensions specified - scale to fit while maintaining aspect ratio
  let height = maxHeight;
  let width = height * originalAspectRatio;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / originalAspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * originalAspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
}
