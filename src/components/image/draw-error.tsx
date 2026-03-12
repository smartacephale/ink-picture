import { Box, Newline, Text } from "ink";
import React from "react";

export function DrawError(props: { hasError: boolean; alt?: string }) {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center">
      {props.hasError && (
        <Text color="red">
          X<Newline />
          Load failed
        </Text>
      )}
      <Text color="gray">{props.alt || "Loading..."}</Text>
    </Box>
  );
}
