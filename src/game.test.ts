import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, boardFromMoves, canPlace, findWinLine, gameStatus, type Point } from './game';

/** 黒の手を順に並べ、間に白の手を（勝負に関係ない場所へ）挟む。 */
function blackWith(black: Point[], white: Point[]): Point[] {
  const moves: Point[] = [];
  black.forEach((b, i) => {
    moves.push(b);
    const w = white[i];
    if (w && i < black.length - 1) moves.push(w);
  });
  return moves;
}

const farWhite: Point[] = [
  { x: 0, y: 14 },
  { x: 2, y: 14 },
  { x: 4, y: 14 },
  { x: 6, y: 14 },
  { x: 8, y: 14 },
];

const pts = (...xy: [number, number][]): Point[] => xy.map(([x, y]) => ({ x, y }));

describe('gameStatus', () => {
  it('初期状態は黒番', () => {
    expect(gameStatus([])).toEqual({ kind: 'playing', turn: 'black' });
  });

  it('4つではまだ勝ちではない', () => {
    const moves = blackWith(pts([3, 7], [4, 7], [5, 7], [6, 7]), farWhite);
    expect(gameStatus(moves)).toEqual({ kind: 'playing', turn: 'white' });
  });

  it.each([
    ['横', pts([3, 7], [4, 7], [5, 7], [6, 7], [7, 7])],
    ['縦', pts([7, 3], [7, 4], [7, 5], [7, 6], [7, 7])],
    ['右下がり斜め', pts([1, 1], [2, 2], [3, 3], [4, 4], [5, 5])],
    ['右上がり斜め', pts([1, 9], [2, 8], [3, 7], [4, 6], [5, 5])],
  ])('%s に5つ並べば勝ち', (_, black) => {
    const status = gameStatus(blackWith(black, farWhite));
    expect(status.kind).toBe('won');
    if (status.kind === 'won') {
      expect(status.winner).toBe('black');
      expect(status.line).toHaveLength(5);
    }
  });

  it('最後の手が連の真ん中でも勝ちになり、連を端から順に返す', () => {
    const status = gameStatus(blackWith(pts([3, 7], [4, 7], [6, 7], [7, 7], [5, 7]), farWhite));
    expect(status).toMatchObject({ kind: 'won', line: pts([3, 7], [4, 7], [5, 7], [6, 7], [7, 7]) });
  });

  it('6つ以上並んでも勝ち（自由ルール）', () => {
    const status = gameStatus(
      blackWith(pts([2, 7], [3, 7], [4, 7], [6, 7], [7, 7], [5, 7]), [...farWhite, { x: 10, y: 14 }]),
    );
    expect(status).toMatchObject({ kind: 'won', winner: 'black' });
    if (status.kind === 'won') expect(status.line).toHaveLength(6);
  });

  it('盤の端に沿った5連も勝ち', () => {
    const status = gameStatus(blackWith(pts([10, 0], [11, 0], [12, 0], [13, 0], [14, 0]), farWhite));
    expect(status).toMatchObject({ kind: 'won', winner: 'black' });
  });

  it('盤の端をまたいで連が続くことはない', () => {
    // 1行目の右端3つと2行目の左端2つは、添字では連続するが盤上ではつながっていない
    const status = gameStatus(blackWith(pts([12, 0], [13, 0], [14, 0], [0, 1], [1, 1]), farWhite));
    expect(status.kind).toBe('playing');
  });

  it('白も5つ並べば勝ち', () => {
    const moves = pts([0, 0], [5, 5], [2, 0], [6, 5], [4, 0], [7, 5], [6, 0], [8, 5], [8, 0], [9, 5]);
    expect(gameStatus(moves)).toMatchObject({ kind: 'won', winner: 'white' });
  });

  it('間に相手の石があれば勝ちではない', () => {
    const moves = pts([3, 7], [5, 7], [4, 7], [0, 14], [6, 7], [2, 14], [7, 7], [4, 14], [8, 7]);
    expect(gameStatus(moves).kind).toBe('playing');
  });

  it('盤が埋まって勝者がいなければ引き分け', () => {
    // 2列ずつ・1行ごとに色を入れ替える模様
    const black: Point[] = [];
    const white: Point[] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const isBlack = (Math.floor(x / 2) + y) % 2 === 0;
        (isBlack ? black : white).push({ x, y });
      }
    }
    // 黒が1つ多い（225マス）ので交互に並べられる
    expect(black.length).toBe(white.length + 1);
    const moves: Point[] = [];
    black.forEach((b, i) => {
      moves.push(b);
      const w = white[i];
      if (w) moves.push(w);
    });
    // gameStatus は最後の手しか見ないので、途中で5連ができていないことを盤全体で確かめる
    const board = boardFromMoves(moves);
    expect(moves.every((m) => findWinLine(board, m) === null)).toBe(true);
    expect(gameStatus(moves)).toEqual({ kind: 'draw' });
  });
});

describe('canPlace', () => {
  it('空いているマスには置ける', () => {
    expect(canPlace([], { x: 7, y: 7 })).toBe(true);
  });

  it('石があるマスには置けない', () => {
    expect(canPlace(pts([7, 7]), { x: 7, y: 7 })).toBe(false);
  });

  it('盤の外には置けない', () => {
    expect(canPlace([], { x: BOARD_SIZE, y: 0 })).toBe(false);
    expect(canPlace([], { x: -1, y: 0 })).toBe(false);
  });

  it('勝負がついた後は置けない', () => {
    const moves = blackWith(pts([3, 7], [4, 7], [5, 7], [6, 7], [7, 7]), farWhite);
    expect(canPlace(moves, { x: 10, y: 10 })).toBe(false);
  });
});
