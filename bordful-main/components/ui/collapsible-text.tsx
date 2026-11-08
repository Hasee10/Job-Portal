"use client";

import { useState } from "react";

type CollapsibleTextProps = {
  text: string;
  maxLength: number;
};

export function CollapsibleText({ text, maxLength }: CollapsibleTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // If text is shorter than maxLength, just return it
  if (text.length <= maxLength) {
    return (
      <p className="whitespace-pre-line text-gray-600 text-sm dark:text-gray-400">
        {text}
      </p>
    );
  }

  const displayText = isExpanded
    ? text
    : `${text.substring(0, maxLength).trim()}...`;

  return (
    <div>
      <p className="whitespace-pre-line text-gray-600 text-sm dark:text-gray-400">
        {displayText}
      </p>
      <button
        className="mt-1 text-sm text-zinc-900 underline underline-offset-4 transition-colors hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}
