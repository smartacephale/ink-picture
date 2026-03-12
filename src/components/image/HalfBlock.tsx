import chalk from "chalk";
import { Image } from "imagescript";
import { type DOMElement, measureElement } from "ink";
import React, { useEffect, useRef, useState } from "react";
import { useTerminalCapabilities } from "../../context/TerminalInfo.tsx";
import { calculateImageSize, fetchImage } from "../../utils/image.ts";
import { Draw } from "./draw.tsx";
import type { ImageProps } from "./protocol.ts";

function HalfBlockImage(props: ImageProps) {
  const [imageOutput, setImageOutput] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const containerRef = useRef<DOMElement | null>(null);
  const terminalCapabilities = useTerminalCapabilities();
  const {
    onSupportDetected,
    src,
    width: propsWidth,
    height: propsHeight,
  } = props;

  useEffect(() => {
    if (!terminalCapabilities) return;

    const isSupported =
      terminalCapabilities.supportsColor &&
      terminalCapabilities.supportsUnicode;
    onSupportDetected?.(isSupported);
  }, [onSupportDetected, terminalCapabilities]);

  useEffect(() => {
    const generateImageOutput = async () => {
      const image = await fetchImage(src);
      if (!image || !(image instanceof Image)) {
        setHasError(true);
        return;
      }
      setHasError(false);

      if (!containerRef.current) return;
      const { width: maxWidth, height: maxHeight } = measureElement(
        containerRef.current,
      );

      const { width, height } = calculateImageSize({
        maxWidth: maxWidth,
        maxHeight: maxHeight * 2,
        originalAspectRatio: image.width / image.height,
        specifiedWidth: propsWidth,
        specifiedHeight: propsHeight ? propsHeight * 2 : undefined,
      });

      const resizedImage = image.resize(Math.round(width), Math.round(height));
      const output = toHalfBlocks(resizedImage);
      setImageOutput(output);
    };
    generateImageOutput();
  }, [src, propsWidth, propsHeight]);

  return (
    <Draw
      imageOutput={imageOutput}
      containerRef={containerRef}
      alt={props.alt || ""}
      hasError={hasError}
    />
  );
}

const HALF_BLOCK = "\u2584";

function toHalfBlocks(image: Image) {
  const { width, height, bitmap } = image;
  const channels = 4;

  let result = "";
  for (let y = 0; y < height - 1; y += 2) {
    for (let x = 0; x < width; x++) {
      const topPixelIndex = (y * width + x) * channels;
      const bottomPixelIndex = ((y + 1) * width + x) * channels;

      const r = bitmap[topPixelIndex];
      const g = bitmap[topPixelIndex + 1];
      const b = bitmap[topPixelIndex + 2];
      const a = bitmap[topPixelIndex + 3];

      const r2 = bitmap[bottomPixelIndex];
      const g2 = bitmap[bottomPixelIndex + 1];
      const b2 = bitmap[bottomPixelIndex + 2];

      result +=
        a === 0
          ? chalk.reset(" ")
          : chalk.bgRgb(r, g, b).rgb(r2, g2, b2)(HALF_BLOCK);
    }

    result += "\n";
  }

  return result;
}

export default HalfBlockImage;
