export const BOARD_SIZE = 15;
export const WIN_LENGTH = 5;

export type Stone = 'black' | 'white';
export type Cell = Stone | null;
export type Point = { x: number; y: number };
/** 盤面。添字は y * BOARD_SIZE + x */
export type Board = Cell[];

export type GameStatus =
  | { kind: 'playing'; turn: Stone }
  | { kind: 'won'; winner: Stone; line: Point[] }
  | { kind: 'draw' };

const DIRECTIONS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
];

export function inBounds(p: Point): boolean {
  return p.x >= 0 && p.x < BOARD_SIZE && p.y >= 0 && p.y < BOARD_SIZE;
}

export function cellAt(board: Board, p: Point): Cell {
  return board[p.y * BOARD_SIZE + p.x] ?? null;
}

/** 手番の色。黒が先手なので、偶数手目（0始まり）は黒。 */
export function stoneForMove(index: number): Stone {
  return index % 2 === 0 ? 'black' : 'white';
}

export function boardFromMoves(moves: readonly Point[]): Board {
  const board: Board = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  moves.forEach((p, i) => {
    board[p.y * BOARD_SIZE + p.x] = stoneForMove(i);
  });
  return board;
}

/**
 * p を通る、p と同じ色の連が WIN_LENGTH 以上あればその連全体を返す。
 * 自由ルールなので6つ以上も勝ち。
 */
export function findWinLine(board: Board, p: Point): Point[] | null {
  const stone = cellAt(board, p);
  if (!stone) return null;
  for (const d of DIRECTIONS) {
    const line: Point[] = [p];
    for (const sign of [1, -1]) {
      let q = { x: p.x + d.x * sign, y: p.y + d.y * sign };
      while (inBounds(q) && cellAt(board, q) === stone) {
        if (sign === 1) line.push(q);
        else line.unshift(q);
        q = { x: q.x + d.x * sign, y: q.y + d.y * sign };
      }
    }
    if (line.length >= WIN_LENGTH) return line;
  }
  return null;
}

/** 勝敗は最後の手でしか決まらないので、最後の手だけを調べる。 */
export function gameStatus(moves: readonly Point[]): GameStatus {
  const last = moves[moves.length - 1];
  if (last) {
    const line = findWinLine(boardFromMoves(moves), last);
    if (line) return { kind: 'won', winner: stoneForMove(moves.length - 1), line };
    if (moves.length === BOARD_SIZE * BOARD_SIZE) return { kind: 'draw' };
  }
  return { kind: 'playing', turn: stoneForMove(moves.length) };
}

export function canPlace(moves: readonly Point[], p: Point): boolean {
  if (!inBounds(p)) return false;
  if (gameStatus(moves).kind !== 'playing') return false;
  return !moves.some((m) => m.x === p.x && m.y === p.y);
}
