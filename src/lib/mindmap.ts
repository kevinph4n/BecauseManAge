import type { BlockFont, BlockStyle, MindEdge, MindNode, MindmapData } from "./types";

export const DEFAULT_STYLE: BlockStyle = {
  font: "sans",
  size: 15,
  bg: "#ffffff",
  color: "#111111",
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  border: "sketch",
};

export const FONT_FAMILY: Record<BlockFont, string> = {
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
  mono: "var(--font-mono)",
  hand: "var(--font-hand)",
};

export const FONT_LABEL: Record<BlockFont, string> = {
  sans: "Sans",
  serif: "Serif",
  mono: "Mono",
  hand: "Viết tay",
};

export const BG_SWATCHES = [
  "#ffffff",
  "#f1f1ec",
  "#111111",
  "#fff1a8",
  "#d4efff",
  "#d8f2d8",
  "#ffd9d6",
  "#eadfff",
  "transparent",
];

export const TEXT_SWATCHES = ["#111111", "#ffffff", "#6b6b66", "#c4342d", "#1f6fb2", "#2f8a3b"];

export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export function isDark(hex: string) {
  if (!hex.startsWith("#") || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
}

export function makeNode(x: number, y: number, html = "", style: Partial<BlockStyle> = {}, w = 200): MindNode {
  return { id: uid(), x, y, w, html, style: { ...DEFAULT_STYLE, ...style } };
}

function tree(
  center: { text: string; style?: Partial<BlockStyle> },
  branches: { text: string; style?: Partial<BlockStyle>; children: string[] }[],
): MindmapData {
  const nodes: MindNode[] = [];
  const edges: MindEdge[] = [];
  const root = makeNode(60, 40 + (branches.length * 150) / 2 - 30, center.text, {
    size: 22,
    bold: true,
    font: "hand",
    bg: "#111111",
    color: "#ffffff",
    align: "center",
    ...center.style,
  }, 220);
  nodes.push(root);
  branches.forEach((b, i) => {
    const bn = makeNode(360, 40 + i * 150, b.text, { font: "hand", size: 19, bold: true, ...b.style }, 190);
    nodes.push(bn);
    edges.push({ id: uid(), from: root.id, to: bn.id });
    b.children.forEach((c, j) => {
      const cn = makeNode(640, 20 + i * 150 + j * 62, c, { size: 14 }, 260);
      nodes.push(cn);
      edges.push({ id: uid(), from: bn.id, to: cn.id });
    });
  });
  return { nodes, edges, viewport: { x: 40, y: 40, zoom: 0.9 } };
}

export const TEMPLATES: { id: string; name: string; desc: string; build: () => MindmapData }[] = [
  {
    id: "blank",
    name: "Trang trắng",
    desc: "Một khối ở giữa, phần còn lại là của bạn.",
    build: () => ({
      nodes: [makeNode(120, 120, "<b>Ý tưởng chính</b>", { size: 20, font: "hand" }, 220)],
      edges: [],
      viewport: { x: 80, y: 80, zoom: 1 },
    }),
  },
  {
    id: "food",
    name: "Quán ăn theo quận",
    desc: "Lưu quán ngon Q1, Q3, Bình Thạnh…",
    build: () =>
      tree({ text: "Quán ngon 🍜" }, [
        {
          text: "Quận 1",
          style: { bg: "#fff1a8" },
          children: ["Phở — đi sớm trước 8h", "Cơm tấm — <i>sườn nướng than</i>, đông giờ trưa"],
        },
        {
          text: "Quận 3",
          style: { bg: "#d4efff" },
          children: ["Bánh xèo — ngồi ngoài vỉa hè vibe", "Bún bò — <b>cay</b>, gọi thêm chả"],
        },
        {
          text: "Bình Thạnh",
          style: { bg: "#d8f2d8" },
          children: ["Cà phê làm việc — có ổ cắm, yên tĩnh", "Lẩu — hợp đi nhóm 6+"],
        },
      ]),
  },
  {
    id: "person",
    name: "Hồ sơ một người",
    desc: "Đặc điểm cần lưu ý của một người.",
    build: () =>
      tree({ text: "Anh/Chị X" }, [
        { text: "Tính cách", children: ["Thẳng thắn, thích số liệu", "Không thích họp dài"] },
        { text: "Cần lưu ý", style: { bg: "#ffd9d6" }, children: ["<b>Dị ứng hải sản</b>", "Nhắn tin trước khi gọi"] },
        { text: "Ngày quan trọng", children: ["Sinh nhật: 12/03", "Kỷ niệm vào công ty: 01/09"] },
      ]),
  },
  {
    id: "project",
    name: "Brainstorm dự án",
    desc: "Mục tiêu → rủi ro → việc cần làm.",
    build: () =>
      tree({ text: "Dự án mới" }, [
        { text: "Mục tiêu", children: ["Ra MVP trong 4 tuần", "10 user thật dùng thử"] },
        { text: "Rủi ro", style: { bg: "#ffd9d6" }, children: ["Thiếu người làm design", "Scope phình to"] },
        { text: "Việc cần làm", style: { bg: "#d8f2d8" }, children: ["Chốt milestones", "Phân công người làm"] },
      ]),
  },
];
