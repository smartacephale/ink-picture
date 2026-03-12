/**
 * ink-picture - Better image component for Ink CLI/TUIs
 *
 * This library provides components for rendering images in terminal applications
 * built with Ink. It supports multiple rendering protocols with automatic fallback:
 * Half-Block, Braille, ASCII, and Sixel (experimental).
 *
 * @example
 * ```tsx
 * import React from 'react';
 * import { Box } from 'ink';
 * import Image, { TerminalInfoProvider } from 'ink-picture';
 *
 * function App() {
 *   return (
 *     <TerminalInfoProvider>
 *       <Box flexDirection="column">
 *         <Image
 *           src="https://example.com/image.jpg"
 *           width={40}
 *           height={20}
 *           alt="Example image"
 *         />
 *       </Box>
 *     </TerminalInfoProvider>
 *   );
 * }
 *
 * Notice that the Image component must be used within a TerminalInfoProvider.
 * This ensures terminal capabilities and information (like width and height in pixels) are detected and provided to the Image component.
 * ```
 */

// Individual image rendering components - for advanced usage
export { default as AsciiImage } from "./components/image/Ascii.tsx";
export { default as BrailleImage } from "./components/image/Braille.tsx";
export { default as HalfBlockImage } from "./components/image/HalfBlock.tsx";
export type { ImageProtocolName } from "./components/image/index.tsx";
// Main Image component - the primary export
export { default } from "./components/image/index.tsx";
// Types and interfaces
export type { ImageProps, ImageProtocol } from "./components/image/protocol.ts";
export { default as SixelImage } from "./components/image/Sixel.tsx";
export type {
  TerminalCapabilities,
  TerminalDimensions,
  TerminalInfo,
} from "./context/TerminalInfo.tsx";
// Terminal info context and provider - required for Image component
export {
  TerminalInfoContext,
  TerminalInfoProvider,
  useTerminalCapabilities,
  useTerminalDimensions,
  useTerminalInfo,
} from "./context/TerminalInfo.tsx";

// Utility hooks
export { default as usePosition } from "./hooks/usePosition.ts";

// Note: utils are kept internal for now, but can be exported later if needed
