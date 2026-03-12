import { clearTimeout, setTimeout } from "node:timers";
import { Image } from "imagescript";
import { type DOMElement, useStdout } from "ink";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { image2sixel } from "sixel";
import {
  useTerminalCapabilities,
  useTerminalDimensions,
} from "../../context/TerminalInfo.tsx";
import usePosition from "../../hooks/usePosition.ts";
import { calculateImageSize, fetchImage } from "../../utils/image.ts";
import { Draw } from "./draw.tsx";
import type { ImageProps } from "./protocol.ts";

function SixelImage(props: ImageProps) {
  const [imageOutput, setImageOutput] = useState<string | undefined>(undefined);
  const [hasError, setHasError] = useState<boolean>(false);
  const { stdout } = useStdout();
  const containerRef = useRef<DOMElement | null>(null);
  const componentPosition = usePosition(containerRef);
  const terminalDimensions = useTerminalDimensions();
  const terminalCapabilities = useTerminalCapabilities();
  const [actualSizeInCells, setActualSizeInCells] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const shouldCleanupRef = useRef<boolean>(true);
  const {
    src,
    onSupportDetected,
    width: propsWidth,
    height: propsHeight,
  } = props;

  useEffect(() => {
    if (!terminalCapabilities) return;
    const isSupported = terminalCapabilities.supportsSixelGraphics;
    onSupportDetected?.(isSupported);
  }, [terminalCapabilities, onSupportDetected]);

  useEffect(() => {
    const generateImageOutput = async () => {
      if (!componentPosition || !terminalDimensions) return;

      const image = await fetchImage(src);
      // image2sixel and ImageScript Image properties won't exist on undefined
      // We explicitly check for Image type here
      if (!image || !(image instanceof Image)) {
        setHasError(true);
        return;
      }
      setHasError(false);

      const { width: maxWidth, height: maxHeight } = componentPosition;
      const { width, height } = calculateImageSize({
        maxWidth: maxWidth * terminalDimensions.cellWidth,
        maxHeight: maxHeight * terminalDimensions.cellHeight,
        originalAspectRatio: image.width / image.height,
        specifiedWidth: propsWidth
          ? propsWidth * terminalDimensions.cellWidth
          : undefined,
        specifiedHeight: propsHeight
          ? propsHeight * terminalDimensions.cellHeight
          : undefined,
      });

      const resizedImage = image.resize(Math.round(width), Math.round(height));

      setActualSizeInCells({
        width: Math.ceil(resizedImage.width / terminalDimensions.cellWidth),
        height: Math.ceil(resizedImage.height / terminalDimensions.cellHeight),
      });

      const output = toSixel(resizedImage);
      setImageOutput(output);
    };
    generateImageOutput();
  }, [src, propsWidth, propsHeight, componentPosition, terminalDimensions]);

  useLayoutEffect(() => {
    if (!imageOutput || !componentPosition || !actualSizeInCells) return;
    if (
      stdout.rows - componentPosition.appHeight + componentPosition.row < 0 ||
      componentPosition.col > stdout.columns
    )
      return;

    function onExit() {
      shouldCleanupRef.current = false;
    }
    function onSigInt() {
      shouldCleanupRef.current = false;
      process.exit();
    }
    process.on("exit", onExit);
    process.on("SIGINT", onSigInt);
    process.on("SIGTERM", onSigInt);

    let previousRenderBoundingBox:
      | { row: number; col: number; width: number; height: number }
      | undefined;

    const renderTimeout = setTimeout(() => {
      stdout.write("\x1b7");
      stdout.write(
        cursorUp(componentPosition.appHeight - componentPosition.row),
      );
      stdout.write("\r");
      stdout.write(cursorForward(componentPosition.col));
      stdout.write(imageOutput);
      stdout.write("\x1b8");

      previousRenderBoundingBox = {
        row: stdout.rows - componentPosition.appHeight + componentPosition.row,
        col: componentPosition.col,
        width: actualSizeInCells.width,
        height: actualSizeInCells.height,
      };
    }, 100);

    return () => {
      process.removeListener("exit", onExit);
      process.removeListener("SIGINT", onSigInt);
      process.removeListener("SIGTERM", onSigInt);

      if (!shouldCleanupRef.current) return;
      clearTimeout(renderTimeout);
      if (!previousRenderBoundingBox) return;

      stdout.write("\x1b7");
      stdout.write(
        cursorUp(componentPosition.appHeight - componentPosition.row),
      );
      for (let i = 0; i < previousRenderBoundingBox.height; i++) {
        stdout.write("\r");
        stdout.write(cursorForward(previousRenderBoundingBox.col));
        stdout.write(" ".repeat(previousRenderBoundingBox.width));
        stdout.write("\n");
      }
      stdout.write("\x1b8");
    };
  });

  return (
    <Draw
      imageOutput={imageOutput}
      containerRef={containerRef}
      alt={props.alt || ""}
      hasError={hasError}
    />
  );
}

function toSixel(image: Image): string {
  return image2sixel(image.bitmap, image.width, image.height);
}

function cursorForward(count: number = 1) {
  return `\x1b[${count}C`;
}
function cursorUp(count: number = 1) {
  return `\x1b[${count}A`;
}

export default SixelImage;
