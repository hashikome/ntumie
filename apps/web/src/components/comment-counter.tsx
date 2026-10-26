"use client";
import { maxCommentLength } from "@ntumie/types";
import { useEffect, useState } from "react";

// Appears only near the limit, so most comments are written without a counter.
export function CommentCounter({ fieldId }: { fieldId: string }) {
  const [length, setLength] = useState(0);
  useEffect(() => {
    const field = document.getElementById(fieldId) as HTMLTextAreaElement | null;
    if (!field) return;
    const update = () => setLength(field.value.length);
    update();
    field.addEventListener("input", update);
    return () => field.removeEventListener("input", update);
  }, [fieldId]);
  if (length < maxCommentLength - 200) return null;
  return (
    <span className="comment-count" aria-live="polite">
      {length.toLocaleString("en")} / {maxCommentLength.toLocaleString("en")}
    </span>
  );
}
