import { useEffect, useRef } from "react";

const RANDOM_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ANIMATION_INTERVAL_MS = 75;

type ObfuscatorProps = {
  html: string;
};

export default function Obfuscator({ html }: ObfuscatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const elements = Array.from(container.querySelectorAll<HTMLElement>("[data-obfuscated]"));
    const intervals = elements.map((element) => {
      const originalText = element.textContent ?? "";
      const intervalId = window.setInterval(() => {
        element.textContent = Array.from({ length: originalText.length }, () => {
          const randomIndex = Math.floor(Math.random() * RANDOM_CHARS.length);
          return RANDOM_CHARS[randomIndex];
        }).join("");
      }, ANIMATION_INTERVAL_MS);

      return {
        element,
        intervalId,
        originalText,
      };
    });

    return () => {
      intervals.forEach(({ element, intervalId, originalText }) => {
        window.clearInterval(intervalId);
        element.textContent = originalText;
      });
    };
  }, [html]);

  const lines = html.split("<br>");

  return (
    <div
      ref={containerRef}
      className="grid gap-0.5 overflow-hidden whitespace-pre font-mono text-[13px] leading-5"
    >
      {lines.map((line, index) => (
        <div
          key={`${index}-${line.length}`}
          dangerouslySetInnerHTML={{ __html: line }}
        />
      ))}
    </div>
  );
}
