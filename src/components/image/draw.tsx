import { Box, type DOMElement, Text } from "ink";
import React, { useMemo } from "react";
import { DrawError } from "./draw-error.tsx";

export function Draw(props: {
  imageOutput: string | null | undefined;
  containerRef: React.Ref<DOMElement>;
  hasError: boolean;
  alt?: string;
}) {
  const lines = useMemo(() => {
    return props.imageOutput
      ? props.imageOutput.split("\n").map((line, i) => ({
          id: `${i}-${line.length}`,
          content: line,
        }))
      : [];
  }, [props.imageOutput]);

  return (
    <Box ref={props.containerRef} flexDirection="column" flexGrow={1}>
      {lines.length > 0 ? (
        lines.map((line) => <Text key={line.id}>{line.content}</Text>)
      ) : (
        <DrawError hasError={props.hasError} alt={props.alt} />
      )}
    </Box>
  );
}
