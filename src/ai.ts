import {
  BOARD_SIZE,
  WIN_LENGTH,
  boardFromMoves,
  cellAt,
  findWinLine,
  inBounds,
  stoneForMove,
  type Board,
  type Point,
  type Stone,
} from './game';

const DIRECTIONS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
];

/** 着手候補を既存の石からこの距離以内に絞る */
const CANDIDATE_RANGE = 2;

const CENTER: Point = { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) };

/** 相手の形を潰す価値は、自分の形を作る価値より少し低く見る */
const DEFENSE_WEIGHT = 0.9;

const opponent = (s: Stone): Stone => (s === 'black' ? 'white' : 'black');

/** 連の長さと、両端のうち空いている数から点数を決める */
function patternValue(count: number, openEnds: number): number {
  if (count >= WIN_LENGTH) return 100_000;
  if (openEnds === 0) return 0;
  const open = openEnds === 2;
  switch (count) {
    case 4:
      return open ? 10_000 : 1_000;
    case 3:
      return open ? 1_000 : 100;
    case 2:
      return open ? 100 : 10;
    default:
      return open ? 10 : 1;
  }
}

/** p に stone を置いたとき、4方向それぞれにできる連の点数の合計 */
function pointValue(board: Board, p: Point, stone: Stone): number {
  let total = 0;
  for (const d of DIRECTIONS) {
    let count = 1;
    let openEnds = 0;
    for (const sign of [1, -1]) {
      let q = { x: p.x + d.x * sign, y: p.y + d.y * sign };
      while (inBounds(q) && cellAt(board, q) === stone) {
        count++;
        q = { x: q.x + d.x * sign, y: q.y + d.y * sign };
      }
      if (inBounds(q) && cellAt(board, q) === null) openEnds++;
    }
    total += patternValue(count, openEnds);
  }
  return total;
}

/** 既存の石から CANDIDATE_RANGE 以内の空きマス */
export function candidateMoves(board: Board): Point[] {
  const result: Point[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (cellAt(board, { x, y }) !== null) continue;
      let near = false;
      for (let dy = -CANDIDATE_RANGE; dy <= CANDIDATE_RANGE && !near; dy++) {
        for (let dx = -CANDIDATE_RANGE; dx <= CANDIDATE_RANGE && !near; dx++) {
          const q = { x: x + dx, y: y + dy };
          if (inBounds(q) && cellAt(board, q) !== null) near = true;
        }
      }
      if (near) result.push({ x, y });
    }
  }
  return result;
}

function winsAt(board: Board, p: Point, stone: Stone): boolean {
  const i = p.y * BOARD_SIZE + p.x;
  board[i] = stone;
  const won = findWinLine(board, p) !== null;
  board[i] = null;
  return won;
}

/**
 * 次の手番の手を決める。
 * 1. 自分が勝てる手があれば打つ
 * 2. 相手が次に勝てる手があれば塞ぐ
 * 3. それ以外は、自分の形を作る価値と相手の形を潰す価値の合計が最大の手
 */
export function chooseMove(moves: readonly Point[]): Point {
  const board = boardFromMoves(moves);
  const me = stoneForMove(moves.length);
  const them = opponent(me);
  const candidates = candidateMoves(board);
  if (candidates.length === 0) return CENTER;

  const win = candidates.find((p) => winsAt(board, p, me));
  if (win) return win;
  const block = candidates.find((p) => winsAt(board, p, them));
  if (block) return block;

  let best = candidates[0]!;
  let bestScore = -Infinity;
  for (const p of candidates) {
    // 同点なら中央に近い手を選ぶ
    const centerBias = -(Math.abs(p.x - CENTER.x) + Math.abs(p.y - CENTER.y)) * 0.01;
    const score = pointValue(board, p, me) + pointValue(board, p, them) * DEFENSE_WEIGHT + centerBias;
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}
