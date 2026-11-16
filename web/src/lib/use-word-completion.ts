import { useEffect, useRef, useState } from "react";
import { post } from "./api";
type Prediction = { key: string; text: string; cursor: number; suffix: string };
export function useWordCompletion(
  key: string | null,
  text: string,
  cursor: number,
  enabled: boolean,
) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const latest = useRef<Prediction | null>(null),
    generation = useRef(0);
  const dismiss = (accepted = false) => {
    const value = latest.current;
    latest.current = null;
    setPrediction(null);
    if (value)
      void post("/api/cmd", {
        key: value.key,
        cmd: {
          type: "predict_word_feedback",
          text: value.text,
          cursor: value.cursor,
          suggestion: value.suffix,
          accepted,
        },
      }).catch(() => {});
    return value;
  };
  useEffect(() => {
    const epoch = ++generation.current;
    dismiss();
    if (
      !key ||
      !enabled ||
      cursor !== text.length ||
      !text.trim() ||
      text.startsWith("/")
    )
      return;
    const timer = setTimeout(async () => {
      try {
        const response = await post("/api/cmd", {
          key,
          cmd: { type: "predict_word", text, cursor },
        });
        if (
          epoch !== generation.current ||
          !response.ok ||
          typeof response.data?.suffix !== "string" ||
          !response.data.suffix
        )
          return;
        const value = { key, text, cursor, suffix: response.data.suffix };
        latest.current = value;
        setPrediction(value);
      } catch {
        /* Missing or failed native prediction is simply no completion. */
      }
    }, 300);
    return () => {
      generation.current++;
      clearTimeout(timer);
    };
  }, [key, text, cursor, enabled]);
  useEffect(
    () => () => {
      const value = latest.current;
      if (value)
        void post("/api/cmd", {
          key: value.key,
          cmd: {
            type: "predict_word_feedback",
            text: value.text,
            cursor: value.cursor,
            suggestion: value.suffix,
            accepted: false,
          },
        }).catch(() => {});
    },
    [],
  );
  return { prediction, dismiss };
}
