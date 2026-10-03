import './style.css';
import type { AiRequest, AiResponse } from './ai.worker';
import { BOARD_SIZE, canPlace, cellAt, boardFromMoves, gameStatus, type Point, type Stone } from './game';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** 交点の間隔（SVG 座標）。盤の外周には半マス分の余白を取る。 */
const GAP = 10;
const SIZE = GAP * BOARD_SIZE;
const STONE_R = GAP * 0.46;
const STAR_POINTS: readonly Point[] = [
  { x: 3, y: 3 },
  { x: 11, y: 3 },
  { x: 7, y: 7 },
  { x: 3, y: 11 },
  { x: 11, y: 11 },
];

/** CPU の手が一瞬で出ると見落としやすいので、最低限この時間は「考え中」にする */
const MIN_THINK_MS = 400;

const boardEl = document.querySelector<SVGSVGElement>('#board')!;
const statusEl = document.querySelector<HTMLElement>('#status')!;
const resultEl = document.querySelector<HTMLElement>('#result')!;
const newGameButton = document.querySelector<HTMLButtonElement>('#new-game')!;
document.querySelector<HTMLElement>('#version')!.textContent = __APP_VERSION__;

let moves: Point[] = [];
/** 仮置き中のマス。同じマスをもう一度タップすると確定する。 */
let pending: Point | null = null;
// TODO: 対局開始時に先手・後手を選べるようにする
let human: Stone = 'black';
let thinking = false;
/** CPU への依頼の通し番号。新しい対局を始めたら古い応答を捨てるのに使う。 */
let requestId = 0;

const worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });

const coord = (i: number) => GAP / 2 + i * GAP;
const samePoint = (a: Point | null, b: Point | null) => !!a && !!b && a.x === b.x && a.y === b.y;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function drawGrid(): SVGGElement {
  const g = svg('g', {});
  g.append(svg('rect', { x: 0, y: 0, width: SIZE, height: SIZE, fill: 'var(--board)' }));
  for (let i = 0; i < BOARD_SIZE; i++) {
    const attrs = { stroke: 'var(--grid)', 'stroke-width': 0.4 };
    g.append(svg('line', { x1: coord(0), y1: coord(i), x2: coord(BOARD_SIZE - 1), y2: coord(i), ...attrs }));
    g.append(svg('line', { x1: coord(i), y1: coord(0), x2: coord(i), y2: coord(BOARD_SIZE - 1), ...attrs }));
  }
  for (const p of STAR_POINTS) {
    g.append(svg('circle', { cx: coord(p.x), cy: coord(p.y), r: 1, fill: 'var(--grid)' }));
  }
  return g;
}

function drawStone(p: Point, stone: Stone, opacity = 1): SVGCircleElement {
  return svg('circle', {
    cx: coord(p.x),
    cy: coord(p.y),
    r: STONE_R,
    fill: stone === 'black' ? '#1d1b19' : '#fbfaf7',
    stroke: '#1d1b19',
    'stroke-width': stone === 'black' ? 0 : 0.4,
    opacity,
  });
}

function render(): void {
  const status = gameStatus(moves);
  const board = boardFromMoves(moves);
  const winLine = status.kind === 'won' ? status.line : [];

  boardEl.replaceChildren(drawGrid());
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const stone = cellAt(board, { x, y });
      if (stone) boardEl.append(drawStone({ x, y }, stone));
    }
  }

  const last = moves[moves.length - 1];
  if (last) {
    const lastStone = cellAt(board, last)!;
    boardEl.append(
      svg('circle', {
        cx: coord(last.x),
        cy: coord(last.y),
        r: STONE_R * 0.3,
        fill: lastStone === 'black' ? '#fbfaf7' : '#1d1b19',
      }),
    );
  }

  for (const p of winLine) {
    boardEl.append(
      svg('circle', { cx: coord(p.x), cy: coord(p.y), r: STONE_R + 0.6, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1 }),
    );
  }

  if (pending && status.kind === 'playing') {
    boardEl.append(drawStone(pending, status.turn, 0.5));
  }

  if (status.kind === 'playing') {
    statusEl.textContent = thinking ? 'CPU 考え中…' : 'あなたの番';
    resultEl.hidden = true;
  } else {
    const text = status.kind === 'won' ? (status.winner === human ? 'あなたの勝ち' : 'あなたの負け') : '引き分け';
    statusEl.textContent = text;
    resultEl.textContent = text;
    resultEl.hidden = false;
    // 5連を隠さないよう、5連のない側に出す
    const lineCenterY = winLine.reduce((sum, p) => sum + p.y, 0) / (winLine.length || 1);
    resultEl.classList.toggle('bottom', winLine.length > 0 && lineCenterY < BOARD_SIZE / 2);
  }
}

/** タップ位置に一番近い交点。 */
function pointFromEvent(e: PointerEvent): Point | null {
  const ctm = boardEl.getScreenCTM();
  if (!ctm) return null;
  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return { x: Math.round((pt.x - GAP / 2) / GAP), y: Math.round((pt.y - GAP / 2) / GAP) };
}

boardEl.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);

function startCpuTurnIfNeeded(): void {
  const status = gameStatus(moves);
  if (status.kind !== 'playing' || status.turn === human) return;
  thinking = true;
  const request: AiRequest = { id: ++requestId, moves };
  const startedAt = performance.now();
  worker.onmessage = (e: MessageEvent<AiResponse>) => {
    if (e.data.id !== requestId) return;
    const { move } = e.data;
    setTimeout(
      () => {
        if (request.id !== requestId) return;
        thinking = false;
        moves.push(move);
        render();
      },
      Math.max(0, MIN_THINK_MS - (performance.now() - startedAt)),
    );
  };
  worker.postMessage(request);
}

boardEl.addEventListener('pointerup', (e) => {
  if (thinking) return;
  const p = pointFromEvent(e);
  if (!p || !canPlace(moves, p)) {
    pending = null;
  } else if (samePoint(p, pending)) {
    moves.push(p);
    pending = null;
    startCpuTurnIfNeeded();
  } else {
    pending = p;
  }
  render();
});

newGameButton.addEventListener('click', () => {
  if (moves.length > 0 && gameStatus(moves).kind === 'playing' && !confirm('今の対局を終了しますか？')) return;
  moves = [];
  pending = null;
  thinking = false;
  requestId++;
  startCpuTurnIfNeeded();
  render();
});

// iPadOS Safari はビューポート設定を無視してピンチ拡大するので、ジェスチャーごと止める
document.addEventListener('gesturestart', (e) => e.preventDefault());

startCpuTurnIfNeeded();
render();
