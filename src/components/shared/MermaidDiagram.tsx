import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });

let idCounter = 0;

export function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current || !code) return;

    const id = `mermaid-${++idCounter}`;

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
        setError(null);
      })
      .catch(() => {
        setError("Could not render diagram.");
      });
  }, [code]);

  if (error) {
    return (
      <pre className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded overflow-auto">
        {error}
        {"\n\n"}
        {code}
      </pre>
    );
  }

  return <div ref={ref} className="w-full overflow-auto" />;
}
