import { Image } from "imagescript";
import { type DOMElement, measureElement } from "ink";
import React, { useEffect, useRef, useState } from "react";
import { useTerminalCapabilities } from "../../context/TerminalInfo.tsx";
import { calculateImageSize, fetchImage } from "../../utils/image.ts";
import { Draw } from "./draw.tsx";
import type { ImageProps } from "./protocol.ts";

function BrailleImage(props: ImageProps) {
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
    const isSupported = terminalCapabilities.supportsUnicode;
    onSupportDetected?.(isSupported);
  }, [terminalCapabilities, onSupportDetected]);

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
        maxWidth: maxWidth * 2,
        maxHeight: maxHeight * 4,
        originalAspectRatio: image.width / image.height,
        specifiedWidth: propsWidth ? propsWidth * 2 : undefined,
        specifiedHeight: propsHeight ? propsHeight * 4 : undefined,
      });

      const resizedImage = image.resize(Math.round(width), Math.round(height));
      const output = toBraille(resizedImage);
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

function toBraille(image: Image) {
  const { width, height, bitmap } = image;
  const channels = 4;

  let result = "";
  for (let y = 0; y < height - 3; y += 4) {
    for (let x = 0; x < width - 1; x += 2) {
      const getRgba = (px: number, py: number) => {
        const index = (py * width + px) * channels;
        return {
          r: bitmap[index],
          g: bitmap[index + 1],
          b: bitmap[index + 2],
          a: bitmap[index + 3] / 255,
        };
      };

      const dot1 = rgbaToBlackOrWhite(getRgba(x, y));
      const dot2 = rgbaToBlackOrWhite(getRgba(x, y + 1));
      const dot3 = rgbaToBlackOrWhite(getRgba(x, y + 2));
      const dot4 = rgbaToBlackOrWhite(getRgba(x + 1, y));
      const dot5 = rgbaToBlackOrWhite(getRgba(x + 1, y + 1));
      const dot6 = rgbaToBlackOrWhite(getRgba(x + 1, y + 2));
      const dot7 = rgbaToBlackOrWhite(getRgba(x, y + 3));
      const dot8 = rgbaToBlackOrWhite(getRgba(x + 1, y + 3));

      const brailleChar = String.fromCharCode(
        0x2800 +
          (dot8 << 7) +
          (dot7 << 6) +
          (dot6 << 5) +
          (dot5 << 4) +
          (dot4 << 3) +
          (dot3 << 2) +
          (dot2 << 1) +
          dot1,
      );
      result += brailleChar;
    }
    result += "\n";
  }

  return result;
}

function rgbaToBlackOrWhite({
  r,
  g,
  b,
  a,
}: {
  r: number;
  g: number;
  b: number;
  a: number;
}) {
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const alphaAdjustedLuminance = luminance * a + 255 * (1 - a);
  return alphaAdjustedLuminance > 128 ? 1 : 0;
}

export default BrailleImage;
