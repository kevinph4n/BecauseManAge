"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { Modal } from "@/components/modal";
import { BG_SWATCHES, DEFAULT_STYLE, FONT_FAMILY, FONT_LABEL, TEXT_SWATCHES, isDark, makeNode, uid } from "@/lib/mindmap";
import { sanitizeHtml } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/client";
import type { BlockFont, BlockStyle, MindEdge, MindNode, Mindmap } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = { x: number; y: number; zoom: number };

type Drag =
  | { kind: "pan"; startX: number; startY: number; origX: number; origY: number; moved: boolean }
  | { kind: "node"; startX: number; startY: number; starts: Record<string, { x: number; y: number }>; moved: boolean }
  | { kind: "resize"; startX: number; startY: number; id: string; origW: number; moved: boolean }
  | { kind: "link"; startX: number; startY: number; id: string; moved: boolean };

const MIN_W = 120;
const DEFAULT_H = 48;

export function MindmapEditor({ initial, projects }: { initial: Mindmap; projects: { id: string; name: string }[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [nodes, setNodes] = useState<MindNode[]>(initial.data?.nodes ?? []);
  const [edges, setEdges] = useState<MindEdge[]>(initial.data?.edges ?? []);
  const [view, setView] = useState<View>(initial.data?.viewport ?? { x: 80, y: 80, zoom: 1 });
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [linkEnd, setLinkEnd] = useState<{ from: string; x: number; y: number } | null>(null);
  const [save, setSave] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [extractOpen, setExtractOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const startEditingRef = useRef<(id: string) => void>(() => {});
  const firstRender = useRef(true);
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => setMounted(true), []);

  // ---------- helpers ----------
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    return { x: (clientX - left - v.x) / v.zoom, y: (clientY - top - v.y) / v.zoom };
  }, []);

  const addEdge = useCallback((from: string, to: string) => {
    setEdges((es) =>
      es.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))
        ? es
        : [...es, { id: uid(), from, to }],
    );
  }, []);

  // ---------- autosave (debounce) ----------
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSave("dirty");
    const t = setTimeout(async () => {
      setSave("saving");
      const { error } = await supabase
        .from("mindmaps")
        .update({ title: title.trim() || "Untitled", data: { nodes, edges, viewport: view } })
        .eq("id", initial.id);
      setSave(error ? "error" : "saved");
    }, 900);
    return () => clearTimeout(t);
  }, [nodes, edges, view, title, supabase, initial.id]);

  // ---------- global pointer handlers ----------
  useEffect(() => {
    function move(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      const z = viewRef.current.zoom;
      if (d.kind === "pan") {
        setView((v) => ({ ...v, x: d.origX + dx, y: d.origY + dy }));
      } else if (d.kind === "node") {
        if (!d.moved) return;
        setNodes((ns) =>
          ns.map((n) => {
            const s = d.starts[n.id];
            return s ? { ...n, x: Math.round(s.x + dx / z), y: Math.round(s.y + dy / z) } : n;
          }),
        );
      } else if (d.kind === "resize") {
        setNodes((ns) => ns.map((n) => (n.id === d.id ? { ...n, w: Math.max(MIN_W, Math.round(d.origW + dx / z)) } : n)));
      } else if (d.kind === "link") {
        const p = toWorld(e.clientX, e.clientY);
        setLinkEnd({ from: d.id, x: p.x, y: p.y });
      }
    }
    function up(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      if (d.kind === "link") {
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-node-id]");
        const to = el?.getAttribute("data-node-id");
        if (to && to !== d.id) {
          addEdge(d.id, to);
        } else if (!d.moved) {
          // click vào nút + → tạo khối con bên phải
          const ns = nodesRef.current;
          const parent = ns.find((n) => n.id === d.id);
          if (parent) {
            const childIds = new Set(edgesRef.current.filter((x) => x.from === parent.id).map((x) => x.to));
            const siblings = ns.filter((n) => childIds.has(n.id)).length;
            const child = makeNode(parent.x + parent.w + 80, parent.y + siblings * 70, "", {
              font: parent.style.font,
            });
            setNodes((cur) => [...cur, child]);
            setEdges((es) => [...es, { id: uid(), from: parent.id, to: child.id }]);
            startEditingRef.current(child.id);
          }
        }
        setLinkEnd(null);
      }
      if (d.kind === "pan" && !d.moved) {
        setSelected([]);
        setSelectedEdge(null);
        setEditing(null);
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [addEdge, toWorld]);

  // ---------- wheel: pan / ctrl+wheel zoom ----------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        setView((v) => {
          const zoom = Math.min(2.5, Math.max(0.25, v.zoom * Math.exp(-e.deltaY * 0.0015)));
          const wx = (cx - v.x) / v.zoom;
          const wy = (cy - v.y) / v.zoom;
          return { zoom, x: cx - wx * zoom, y: cy - wy * zoom };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mounted]);

  // ---------- keyboard ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (e.key === "Escape") {
        if (editing) commitEdit(editing);
        setEditing(null);
        return;
      }
      if (typing) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedEdge) {
          setEdges((es) => es.filter((x) => x.id !== selectedEdge));
          setSelectedEdge(null);
        } else if (selected.length) {
          deleteSelected();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selected.length) {
        e.preventDefault();
        duplicateSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---------- actions ----------
  function commitEdit(id: string) {
    const el = contentRefs.current[id];
    if (!el) return;
    const html = sanitizeHtml(el.innerHTML);
    setNodes((ns) => ns.map((n) => (n.id === id && n.html !== html ? { ...n, html } : n)));
  }

  function startEditing(id: string) {
    setEditing(id);
    setSelected([id]);
    requestAnimationFrame(() => {
      const el = contentRefs.current[id];
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }

  startEditingRef.current = startEditing;

  function addNodeAtCenter() {
    const rect = containerRef.current?.getBoundingClientRect();
    const p = toWorld((rect?.left ?? 0) + (rect?.width ?? 600) / 2 - 100, (rect?.top ?? 0) + (rect?.height ?? 400) / 2 - 24);
    const n = makeNode(Math.round(p.x), Math.round(p.y));
    setNodes((ns) => [...ns, n]);
    startEditing(n.id);
  }

  function deleteSelected() {
    const ids = new Set(selected);
    setNodes((ns) => ns.filter((n) => !ids.has(n.id)));
    setEdges((es) => es.filter((e) => !ids.has(e.from) && !ids.has(e.to)));
    setSelected([]);
    setEditing(null);
  }

  function duplicateSelected() {
    const copies: MindNode[] = nodes
      .filter((n) => selected.includes(n.id))
      .map((n) => ({ ...n, id: uid(), x: n.x + 30, y: n.y + 30, style: { ...n.style } }));
    setNodes((ns) => [...ns, ...copies]);
    setSelected(copies.map((c) => c.id));
  }

  function updateStyle(patch: Partial<BlockStyle>) {
    if (!selected.length) return;
    setNodes((ns) =>
      ns.map((n) => {
        if (!selected.includes(n.id)) return n;
        const style = { ...n.style, ...patch };
        // nền tối mà chữ tối → tự đổi chữ trắng (và ngược lại)
        if (patch.bg && !patch.color) {
          if (isDark(patch.bg) && isDark(style.color)) style.color = "#ffffff";
          if (!isDark(patch.bg) && style.color === "#ffffff" && patch.bg !== "transparent") style.color = "#111111";
        }
        return { ...n, style };
      }),
    );
  }

  /** Đang gõ → format inline phần chữ được bôi đen. Không gõ → format cả khối. */
  function format(cmd: "bold" | "italic" | "underline") {
    if (editing) {
      document.execCommand(cmd);
      return;
    }
    const first = nodes.find((n) => selected.includes(n.id));
    if (!first) return;
    updateStyle({ [cmd]: !first.style[cmd] } as Partial<BlockStyle>);
  }

  function setTextColor(color: string) {
    if (editing) {
      document.execCommand("foreColor", false, color);
      return;
    }
    updateStyle({ color });
  }

  function zoomBy(f: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = (rect?.width ?? 800) / 2;
    const cy = (rect?.height ?? 600) / 2;
    setView((v) => {
      const zoom = Math.min(2.5, Math.max(0.25, v.zoom * f));
      const wx = (cx - v.x) / v.zoom;
      const wy = (cy - v.y) / v.zoom;
      return { zoom, x: cx - wx * zoom, y: cy - wy * zoom };
    });
  }

  function fitView() {
    if (!nodes.length) return setView({ x: 80, y: 80, zoom: 1 });
    const rect = containerRef.current?.getBoundingClientRect();
    const W = rect?.width ?? 1000;
    const H = rect?.height ?? 700;
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.w));
    const maxY = Math.max(...nodes.map((n) => n.y + (heights[n.id] ?? DEFAULT_H)));
    const zoom = Math.min(1.4, Math.max(0.25, Math.min((W - 120) / (maxX - minX || 1), (H - 120) / (maxY - minY || 1))));
    setView({ zoom, x: (W - (maxX - minX) * zoom) / 2 - minX * zoom, y: (H - (maxY - minY) * zoom) / 2 - minY * zoom });
  }

  // ---------- pointer starts ----------
  function onCanvasPointerDown(e: RPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.button !== 1) return;
    if (editing) commitEdit(editing);
    dragRef.current = { kind: "pan", startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y, moved: false };
  }

  function onCanvasDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-node-id]")) return;
    const p = toWorld(e.clientX, e.clientY);
    const n = makeNode(Math.round(p.x - 100), Math.round(p.y - 20));
    setNodes((ns) => [...ns, n]);
    startEditing(n.id);
  }

  function onNodePointerDown(e: RPointerEvent<HTMLDivElement>, node: MindNode) {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedEdge(null);
    if (editing === node.id) return; // đang gõ → để bôi đen chữ bình thường
    if (editing) {
      commitEdit(editing);
      setEditing(null);
    }
    let sel = selected;
    if (e.shiftKey) {
      sel = selected.includes(node.id) ? selected.filter((s) => s !== node.id) : [...selected, node.id];
    } else if (!selected.includes(node.id)) {
      sel = [node.id];
    }
    setSelected(sel);
    const starts: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) if (sel.includes(n.id)) starts[n.id] = { x: n.x, y: n.y };
    dragRef.current = { kind: "node", startX: e.clientX, startY: e.clientY, starts, moved: false };
  }

  function onResizeDown(e: RPointerEvent<HTMLDivElement>, node: MindNode) {
    e.stopPropagation();
    dragRef.current = { kind: "resize", startX: e.clientX, startY: e.clientY, id: node.id, origW: node.w, moved: false };
  }

  function onLinkDown(e: RPointerEvent<HTMLDivElement>, node: MindNode) {
    e.stopPropagation();
    dragRef.current = { kind: "link", startX: e.clientX, startY: e.clientY, id: node.id, moved: false };
  }

  const onMeasure = useCallback((id: string, h: number) => {
    setHeights((hs) => (Math.abs((hs[id] ?? 0) - h) > 1 ? { ...hs, [id]: h } : hs));
  }, []);

  // ---------- render ----------
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const firstSel = nodes.find((n) => selected.includes(n.id));
  const st: BlockStyle = firstSel?.style ?? DEFAULT_STYLE;
  const hasSel = selected.length > 0;

  if (!mounted) {
    return <div className="h-hand p-10 text-2xl">Đang mở bảng…</div>;
  }

  return (
    <div className="fixed inset-x-0 top-14 bottom-0 z-10 flex flex-col bg-paper">
      {/* ---------- top bar ---------- */}
      <div className="flex flex-wrap items-center gap-2 border-b-[1.5px] border-ink bg-white px-3 py-2">
        <Link href="/notes" className="btn btn-ghost btn-sm">
          ← Notes
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-hand min-w-0 flex-1 bg-transparent text-2xl outline-none sm:max-w-xs"
          aria-label="Tên bảng"
        />
        <span className="font-mono text-xs text-smoke">
          {save === "saved" ? "✓ đã lưu" : save === "saving" ? "đang lưu…" : save === "dirty" ? "• chưa lưu" : "⚠ lỗi lưu"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button className="btn btn-sm" onClick={addNodeAtCenter}>
            + Khối
          </button>
          <button className="btn btn-sm" onClick={fitView} title="Vừa màn hình">
            ⤢ Fit
          </button>
          <button className="btn btn-sm" onClick={() => zoomBy(1 / 1.2)}>
            −
          </button>
          <span className="w-12 text-center font-mono text-xs">{Math.round(view.zoom * 100)}%</span>
          <button className="btn btn-sm" onClick={() => zoomBy(1.2)}>
            +
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setExtractOpen(true)}>
            ↗ Đưa vào dự án
          </button>
        </div>
      </div>

      {/* ---------- format bar ---------- */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border-b border-line bg-paper px-3 py-1.5 text-sm transition",
          !hasSel && "pointer-events-none opacity-40",
        )}
        onMouseDown={(e) => {
          // giữ selection khi đang gõ
          if ((e.target as HTMLElement).tagName !== "SELECT" && (e.target as HTMLElement).tagName !== "INPUT") e.preventDefault();
        }}
      >
        <select
          className="input w-auto! py-1!"
          value={st.font}
          onChange={(e) => updateStyle({ font: e.target.value as BlockFont })}
          aria-label="Font"
        >
          {(Object.keys(FONT_LABEL) as BlockFont[]).map((f) => (
            <option key={f} value={f}>
              {FONT_LABEL[f]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button className="btn btn-sm" onClick={() => updateStyle({ size: Math.max(10, st.size - 2) })}>
            A−
          </button>
          <span className="w-8 text-center font-mono text-xs">{st.size}</span>
          <button className="btn btn-sm" onClick={() => updateStyle({ size: Math.min(64, st.size + 2) })}>
            A+
          </button>
        </div>
        <div className="flex gap-1">
          <ToggleBtn on={!editing && st.bold} onClick={() => format("bold")} label="B" className="font-bold" />
          <ToggleBtn on={!editing && st.italic} onClick={() => format("italic")} label="I" className="italic" />
          <ToggleBtn on={!editing && st.underline} onClick={() => format("underline")} label="U" className="underline" />
        </div>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <ToggleBtn key={a} on={st.align === a} onClick={() => updateStyle({ align: a })} label={a === "left" ? "⇤" : a === "center" ? "≡" : "⇥"} />
          ))}
        </div>
        <span className="text-xs text-smoke">Nền</span>
        <div className="flex items-center gap-1">
          {BG_SWATCHES.map((c) => (
            <Swatch key={c} color={c} active={st.bg === c} onClick={() => updateStyle({ bg: c })} />
          ))}
          <input
            type="color"
            className="h-6 w-6 cursor-pointer border border-ink"
            value={st.bg.startsWith("#") ? st.bg : "#ffffff"}
            onChange={(e) => updateStyle({ bg: e.target.value })}
            title="Màu nền tuỳ chọn"
          />
        </div>
        <span className="text-xs text-smoke">Chữ</span>
        <div className="flex items-center gap-1">
          {TEXT_SWATCHES.map((c) => (
            <Swatch key={c} color={c} active={!editing && st.color === c} onClick={() => setTextColor(c)} />
          ))}
        </div>
        <select
          className="input w-auto! py-1!"
          value={st.border}
          onChange={(e) => updateStyle({ border: e.target.value as BlockStyle["border"] })}
          aria-label="Viền"
        >
          <option value="sketch">Viền vẽ tay</option>
          <option value="solid">Viền thẳng</option>
          <option value="dashed">Viền đứt</option>
          <option value="none">Không viền</option>
        </select>
        <div className="ml-auto flex gap-1">
          <button className="btn btn-sm" onClick={duplicateSelected} title="Ctrl/Cmd + D">
            ⧉ Nhân bản
          </button>
          <button className="btn btn-sm btn-danger" onClick={deleteSelected} title="Delete">
            Xoá
          </button>
        </div>
      </div>

      {/* ---------- canvas ---------- */}
      <div
        ref={containerRef}
        className="paper-dots relative flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
        style={{
          backgroundPosition: `${view.x}px ${view.y}px`,
          backgroundSize: `${18 * view.zoom}px ${18 * view.zoom}px`,
          touchAction: "none",
        }}
        onPointerDown={onCanvasPointerDown}
        onDoubleClick={onCanvasDoubleClick}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
        >
          {/* edges */}
          <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1">
            {edges.map((e) => {
              const a = nodeMap.get(e.from);
              const b = nodeMap.get(e.to);
              if (!a || !b) return null;
              const d = edgePath(a, heights[a.id] ?? DEFAULT_H, b, heights[b.id] ?? DEFAULT_H);
              const active = selectedEdge === e.id;
              return (
                <g key={e.id}>
                  <path
                    d={d}
                    stroke="transparent"
                    strokeWidth={14}
                    fill="none"
                    className="pointer-events-auto cursor-pointer"
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      setSelectedEdge(e.id);
                      setSelected([]);
                    }}
                  />
                  <path
                    d={d}
                    stroke="#111"
                    strokeWidth={active ? 3 : 1.6}
                    strokeDasharray={active ? "6 4" : undefined}
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              );
            })}
            {linkEnd &&
              (() => {
                const a = nodeMap.get(linkEnd.from);
                if (!a) return null;
                const sx = a.x + a.w;
                const sy = a.y + (heights[a.id] ?? DEFAULT_H) / 2;
                return (
                  <path
                    d={`M ${sx} ${sy} C ${sx + 60} ${sy}, ${linkEnd.x - 60} ${linkEnd.y}, ${linkEnd.x} ${linkEnd.y}`}
                    stroke="#111"
                    strokeWidth={1.6}
                    strokeDasharray="5 5"
                    fill="none"
                  />
                );
              })()}
          </svg>

          {nodes.map((n) => (
            <NodeView
              key={n.id}
              node={n}
              selected={selected.includes(n.id)}
              editing={editing === n.id}
              registerContent={(el) => {
                contentRefs.current[n.id] = el;
              }}
              onPointerDown={(e) => onNodePointerDown(e, n)}
              onDoubleClick={() => startEditing(n.id)}
              onBlur={() => commitEdit(n.id)}
              onResizeDown={(e) => onResizeDown(e, n)}
              onLinkDown={(e) => onLinkDown(e, n)}
              onMeasure={onMeasure}
            />
          ))}
        </div>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="h-hand text-2xl text-smoke">Double-click vào giấy để tạo khối đầu tiên ✍️</p>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 hidden max-w-md text-xs text-smoke md:block">
          Double-click giấy: tạo khối · Double-click khối: sửa chữ · Kéo nút ● bên phải: nối dây (click: tạo khối con) ·
          Shift+click: chọn nhiều · Cuộn: di chuyển · Ctrl+cuộn: zoom · Delete: xoá
        </div>
      </div>

      <ExtractModal
        open={extractOpen}
        onClose={() => setExtractOpen(false)}
        projects={projects}
        mindmap={{ id: initial.id, title }}
        nodes={nodes}
        selected={selected}
      />
    </div>
  );
}

// =====================================================================

function NodeView({
  node,
  selected,
  editing,
  registerContent,
  onPointerDown,
  onDoubleClick,
  onBlur,
  onResizeDown,
  onLinkDown,
  onMeasure,
}: {
  node: MindNode;
  selected: boolean;
  editing: boolean;
  registerContent: (el: HTMLDivElement | null) => void;
  onPointerDown: (e: RPointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
  onBlur: () => void;
  onResizeDown: (e: RPointerEvent<HTMLDivElement>) => void;
  onLinkDown: (e: RPointerEvent<HTMLDivElement>) => void;
  onMeasure: (id: string, h: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const s = node.style;
  // chỉ set innerHTML ban đầu / khi html đổi từ bên ngoài, tránh nhảy con trỏ khi gõ
  const initialHtml = useMemo(() => ({ __html: sanitizeHtml(node.html) }), [node.html]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => onMeasure(node.id, el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [node.id, onMeasure]);

  const borderStyle: CSSProperties =
    s.border === "none"
      ? { border: "1.5px solid transparent" }
      : s.border === "dashed"
        ? { border: "1.5px dashed #111", borderRadius: 6 }
        : s.border === "solid"
          ? { border: "1.5px solid #111", borderRadius: 4 }
          : {};

  return (
    <div
      ref={boxRef}
      data-node-id={node.id}
      className={cn(
        "group absolute select-none",
        s.border === "sketch" && "sketch",
        selected && "shadow-sketch",
        editing ? "cursor-text" : "cursor-move",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        background: s.bg,
        color: s.color,
        outline: selected ? "2px dashed #111" : undefined,
        outlineOffset: 4,
        ...borderStyle,
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      <div
        ref={registerContent}
        contentEditable={editing}
        suppressContentEditableWarning
        data-placeholder="Gõ gì đó…"
        onBlur={onBlur}
        className={cn("rich min-h-[1.5em] px-3 py-2 break-words outline-none", editing && "select-text")}
        style={{
          fontFamily: FONT_FAMILY[s.font],
          fontSize: s.size,
          fontWeight: s.bold ? 700 : 400,
          fontStyle: s.italic ? "italic" : "normal",
          textDecoration: s.underline ? "underline" : "none",
          textAlign: s.align,
          lineHeight: 1.35,
        }}
        dangerouslySetInnerHTML={initialHtml}
      />
      {/* nút nối dây / tạo con */}
      <div
        title="Kéo để nối · Click để tạo khối con"
        onPointerDown={onLinkDown}
        className="absolute top-1/2 -right-3 h-5 w-5 -translate-y-1/2 cursor-crosshair rounded-full border-[1.5px] border-ink bg-white text-center text-[11px] leading-[16px] font-bold text-ink opacity-0 transition group-hover:opacity-100"
        style={{ opacity: selected ? 1 : undefined }}
      >
        +
      </div>
      {/* resize */}
      <div
        onPointerDown={onResizeDown}
        className="absolute -right-1 -bottom-1 h-3 w-3 cursor-ew-resize border-r-2 border-b-2 border-ink opacity-0 group-hover:opacity-100"
        style={{ opacity: selected ? 1 : undefined }}
      />
    </div>
  );
}

function edgePath(a: MindNode, ah: number, b: MindNode, bh: number) {
  const acx = a.x + a.w / 2;
  const bcx = b.x + b.w / 2;
  const acy = a.y + ah / 2;
  const bcy = b.y + bh / 2;
  let sx: number, sy: number, tx: number, ty: number;
  let horizontal = true;
  if (b.x > a.x + a.w + 10) {
    sx = a.x + a.w; sy = acy; tx = b.x; ty = bcy;
  } else if (b.x + b.w < a.x - 10) {
    sx = a.x; sy = acy; tx = b.x + b.w; ty = bcy;
  } else if (bcy > acy) {
    sx = acx; sy = a.y + ah; tx = bcx; ty = b.y; horizontal = false;
  } else {
    sx = acx; sy = a.y; tx = bcx; ty = b.y + bh; horizontal = false;
  }
  if (horizontal) {
    const k = Math.max(40, Math.abs(tx - sx) / 2);
    const dir = tx > sx ? 1 : -1;
    return `M ${sx} ${sy} C ${sx + k * dir} ${sy}, ${tx - k * dir} ${ty}, ${tx} ${ty}`;
  }
  const k = Math.max(30, Math.abs(ty - sy) / 2);
  const dir = ty > sy ? 1 : -1;
  return `M ${sx} ${sy} C ${sx} ${sy + k * dir}, ${tx} ${ty - k * dir}, ${tx} ${ty}`;
}

function ToggleBtn({ on, onClick, label, className }: { on: boolean; onClick: () => void; label: string; className?: string }) {
  return (
    <button
      className={cn("btn btn-sm w-8 px-0!", on && "btn-primary", className)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={color}
      className={cn("h-6 w-6 rounded-full border-[1.5px] border-ink", active && "ring-2 ring-ink ring-offset-1")}
      style={{
        background:
          color === "transparent"
            ? "repeating-linear-gradient(45deg,#fff 0 3px,#ddd 3px 6px)"
            : color,
      }}
    />
  );
}

// =====================================================================

function ExtractModal({
  open,
  onClose,
  projects,
  mindmap,
  nodes,
  selected,
}: {
  open: boolean;
  onClose: () => void;
  projects: { id: string; name: string }[];
  mindmap: { id: string; title: string };
  nodes: MindNode[];
  selected: string[];
}) {
  const [projectId, setProjectId] = useState("");
  const [scope, setScope] = useState<"selected" | "all">("selected");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setScope(selected.length ? "selected" : "all");
      setTitle(mindmap.title);
      setMsg(null);
      if (!projectId && projects[0]) setProjectId(projects[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const picked = scope === "all" ? nodes : nodes.filter((n) => selected.includes(n.id));

  async function submit() {
    if (!projectId || !picked.length) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("member_notes").insert({
      project_id: projectId,
      title: title.trim() || mindmap.title,
      body: body.trim() || null,
      clip: {
        mindmap_id: mindmap.id,
        mindmap_title: mindmap.title,
        blocks: picked.map((n) => ({ html: sanitizeHtml(n.html), style: n.style })),
      },
    });
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.message });
    else setMsg({ ok: true, text: "Đã đưa vào tab Notes của dự án ✓" });
  }

  return (
    <Modal open={open} onClose={onClose} title="Trích xuất note → dự án">
      {projects.length === 0 ? (
        <p className="text-sm text-smoke">
          Bạn chưa tham gia dự án nào.{" "}
          <Link href="/projects" className="underline">
            Tạo dự án
          </Link>{" "}
          trước nhé.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="label">Dự án</label>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 text-sm">
            <button
              className={cn("btn btn-sm", scope === "selected" && "btn-primary")}
              onClick={() => setScope("selected")}
              disabled={!selected.length}
            >
              Khối đang chọn ({selected.length})
            </button>
            <button className={cn("btn btn-sm", scope === "all" && "btn-primary")} onClick={() => setScope("all")}>
              Cả bảng ({nodes.length})
            </button>
          </div>
          <div>
            <label className="label">Tiêu đề note</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Lời nhắn cho team (tuỳ)</label>
            <textarea className="input min-h-20" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {msg && <p className={cn("text-sm", msg.ok ? "" : "text-danger")}>{msg.text}</p>}
          <div className="flex justify-end gap-2">
            {msg?.ok && (
              <Link href={`/projects/${projectId}/notes`} className="btn btn-sm">
                Mở dự án →
              </Link>
            )}
            <button className="btn btn-primary" onClick={submit} disabled={busy || !picked.length}>
              {busy ? "Đang gửi…" : `Gửi ${picked.length} khối`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
