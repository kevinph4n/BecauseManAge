"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { sanitizeHtml, stripTags } from "@/lib/sanitize";

/**
 * Render HTML do người dùng nhập (từ mindmap) một cách an toàn.
 * Server render text thuần, client sanitize bằng DOMPurify rồi mới render HTML.
 */
export function SafeHtml({ html, className, style }: { html: string; className?: string; style?: CSSProperties }) {
  const [clean, setClean] = useState<string | null>(null);
  useEffect(() => {
    setClean(sanitizeHtml(html));
  }, [html]);

  if (clean === null) {
    return (
      <div className={className} style={style}>
        {stripTags(html)}
      </div>
    );
  }
  return <div className={`rich ${className ?? ""}`} style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}
