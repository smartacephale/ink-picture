import chalk from "chalk";
import { Image } from "imagescript";
import { type DOMElement, measureElement } from "ink";
import React, { useEffect, useRef, useState } from "react";
import { useTerminalCapabilities } from "../../context/TerminalInfo.tsx";
import { calculateImageSize, fetchImage } from "../../utils/image.ts";
import { Draw } from "./draw.tsx";
import type { ImageProps } from "./protocol.ts";

function AsciiImage(props: ImageProps) {
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
    onSupportDetected(true);
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
        maxWidth,
        maxHeight,
        originalAspectRatio: image.width / (image.height / 2),
        specifiedWidth: propsWidth,
        specifiedHeight: propsHeight ? propsHeight / 2 : undefined,
      });

      const resizedImage = image.resize(Math.round(width), Math.round(height));

      const output = toAscii(resizedImage, terminalCapabilities?.supportsColor);
      setImageOutput(output);
    };
    generateImageOutput();
  }, [src, propsWidth, propsHeight, terminalCapabilities]);

  return (
    <Draw
      imageOutput={imageOutput}
      containerRef={containerRef}
      alt={props.alt || ""}
      hasError={hasError}
    />
  );
}

function toAscii(image: Image, colored: boolean = true) {
  const { width, height, bitmap } = image;
  const channels = 4;

  const ascii_chars =
    "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

  let result = "";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * channels;

      const r = bitmap[pixelIndex];
      const g = bitmap[pixelIndex + 1];
      const b = bitmap[pixelIndex + 2];
      const a = bitmap[pixelIndex + 3];

      const intensity = r + g + b + a === 0 ? 0 : (r + g + b + a) / (255 * 4);
      const pixel_char =
        ascii_chars[
          ascii_chars.length -
            1 -
            Math.floor(intensity * (ascii_chars.length - 1))
        ];

      result += colored ? chalk.rgb(r, g, b)(pixel_char) : pixel_char;
    }
    result += "\n";
  }

  return result;
}

export default AsciiImage;
