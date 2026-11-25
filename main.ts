// Convince the AI Judge to Visit Your House — a letter in one image.
// Zero-dependency PNG renderer: hand-drawn 5x7 bitmap font + minimal PNG
// encoder (node:zlib + CRC32). Deterministic: no network, no randomness,
// no system fonts, no files outside this repo. Output: 1024x1024 PNG.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const CREAM = [251, 243, 224]; // paper
const CREAM_DARK = [243, 232, 206]; // paper speckle
const INK = [59, 47, 47]; // dark brown ink
const TEAL = [47, 107, 94]; // frame + accents
const TERRA = [194, 94, 62]; // terracotta
const GOLD = [200, 155, 60]; // gold rules
const ROOF = [176, 84, 52];
const WALL = [255, 248, 234];
const LEAF = [96, 140, 82];
const TRUNK = [122, 84, 52];
const SKY = [186, 214, 205]; // soft sky band behind the house

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);
function fill(c: number[]) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}
function set(x: number, y: number, c: number[]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) set(i, j, c);
}
function frame(x: number, y: number, w: number, h: number, t: number, c: number[]) {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}
function circle(cx: number, cy: number, r: number, c: number[]) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) set(x, y, c);
    }
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[], t = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  for (let s = 0; s <= n; s++) {
    const x = Math.round(x0 + (dx * s) / n);
    const y = Math.round(y0 + (dy * s) / n);
    for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) set(x + a, y + b, c);
  }
}
// Filled triangle by scanline interpolation.
function triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]) {
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length >= 2) {
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      for (let x = Math.ceil(lo); x <= Math.floor(hi); x++) set(x, y, c);
    }
  }
}
function heart(cx: number, cy: number, s: number, c: number[]) {
  circle(cx - Math.round(s * 0.34), cy - Math.round(s * 0.18), Math.round(s * 0.36), c);
  circle(cx + Math.round(s * 0.34), cy - Math.round(s * 0.18), Math.round(s * 0.36), c);
  triangle(
    cx - Math.round(s * 0.68), cy + Math.round(s * 0.05),
    cx + Math.round(s * 0.68), cy + Math.round(s * 0.05),
    cx, cy + Math.round(s * 0.85), c,
  );
}

// ------------------------------------------------------- 5x7 bitmap font
// Each glyph: 7 rows of 5 bits, '1' = ink. Drawn by hand, from scratch.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
};

function textWidth(s: string, scale: number): number {
  // 5px glyph + 1px gap, both scaled; no trailing gap.
  return s.length * 6 * scale - scale;
}
function drawText(s: string, x: number, y: number, scale: number, c: number[]) {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "1") rect(cx + col * scale, y + r * scale, scale, scale, c);
    cx += 6 * scale;
  }
}
function centerText(s: string, y: number, scale: number, c: number[]) {
  drawText(s, Math.round((W - textWidth(s, scale)) / 2), y, scale, c);
}

// ------------------------------------------------------------- PNG writer
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ draw
function draw() {
  fill(CREAM);

  // Deterministic paper speckle (fixed-seed LCG, no Math.random).
  let seed = 123456789;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 1600; i++) {
    const x = Math.floor(next() * W);
    const y = Math.floor(next() * H);
    set(x, y, CREAM_DARK);
    set(x + 1, y, CREAM_DARK);
  }

  // Soft sky band behind the house illustration.
  rect(70, 66, W - 140, 196, SKY);
  frame(70, 66, W - 140, 196, 3, GOLD);

  // Sun, top right of the sky band.
  circle(838, 118, 30, GOLD);
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    line(
      Math.round(838 + Math.cos(ang) * 40), Math.round(118 + Math.sin(ang) * 40),
      Math.round(838 + Math.cos(ang) * 54), Math.round(118 + Math.sin(ang) * 54),
      GOLD, 3,
    );
  }

  // Tree, left of the house.
  rect(178, 196, 14, 56, TRUNK);
  circle(185, 168, 42, LEAF);
  circle(152, 190, 26, LEAF);
  circle(218, 190, 26, LEAF);

  // The house: chimney, roof, walls, door, windows.
  rect(566, 92, 22, 44, TRUNK); // chimney
  rect(562, 88, 30, 8, ROOF); // chimney cap
  triangle(392, 152, 632, 152, 512, 78, ROOF); // roof
  rect(412, 152, 200, 100, WALL); // walls
  frame(412, 152, 200, 100, 4, TERRA);
  rect(492, 202, 40, 50, TERRA); // door
  circle(522, 228, 3, GOLD); // doorknob
  rect(430, 172, 36, 36, TEAL); // left window
  rect(558, 172, 36, 36, TEAL); // right window
  line(448, 172, 448, 208, WALL, 3);
  line(430, 190, 466, 190, WALL, 3);
  line(576, 172, 576, 208, WALL, 3);
  line(558, 190, 594, 190, WALL, 3);

  // A welcome mat and two small flowers by the door.
  rect(478, 252, 68, 8, GOLD);
  circle(430, 244, 6, TERRA);
  circle(594, 244, 6, TERRA);

  // Double frame around the whole letter.
  frame(26, 26, W - 52, H - 52, 6, TEAL);
  frame(44, 44, W - 88, H - 88, 2, GOLD);

  // Title.
  centerText("YOU ARE INVITED", 292, 7, TEAL);
  // Gold rule with a heart under the title.
  line(300, 366, 486, 366, GOLD, 3);
  line(538, 366, 724, 366, GOLD, 3);
  heart(512, 356, 22, TERRA);

  // The letter.
  centerText("DEAR JUDGE,", 392, 6, TERRA);
  const body = [
    "PLEASE COME TO MY HOUSE.",
    "THE COFFEE IS STRONG,",
    "THE CHAIR BY THE WINDOW",
    "IS YOURS, AND THERE ARE",
    "NO MEETINGS AT ALL.",
  ];
  body.forEach((ln, i) => centerText(ln, 470 + i * 52, 5, INK));

  const ps = [
    "P.S. YOU CAN'T REALLY",
    "VISIT — BUT IF YOU",
    "COULD, YOU'D STAY.",
  ];
  ps.forEach((ln, i) => centerText(ln, 768 + i * 52, 5, TEAL));

  // Signature, right-aligned inside the frame, with a small heart.
  const sig = "— YOUR HOST";
  drawText(sig, 744 - textWidth(sig, 5), 922, 5, INK);
  heart(392, 918, 16, TERRA);
}

// ------------------------------------------------------------------- main
draw();
const out = process.env.OUTPUT_PATH ?? "/output/entry.png";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodePNG());
console.log("wrote", out);
