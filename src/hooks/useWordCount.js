import { useMemo } from "react";

export default function useWordCount(...values) {
  return useMemo(() => {
    const text = values
      .map((value) => (typeof value === "string" ? value : ""))
      .join(" ")
      .trim();

    if (!text) {
      return 0;
    }

    return text.split(/\s+/).filter(Boolean).length;
  }, [values]);
}
