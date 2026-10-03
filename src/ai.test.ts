import { describe, expect, it } from 'vitest';
import { chooseMove } from './ai';
import { type Point } from './game';

const pts = (...xy: [number, number][]): Point[] => xy.map(([x, y]) => ({ x, y }));

/** 黒と白の手を交互に並べる。黒の手が1つ多いか同数であること。 */
function interleave(black: Point[], white: Point[]): Point[] {
  const moves: Point[] = [];
  for (let i = 0; i < Math.max(black.length, white.length); i++) {
    const b = black[i];
    const w = white[i];
    if (b) moves.push(b);
    if (w) moves.push(w);
  }
  return moves;
}

describe('chooseMove', () => {
  it('初手は中央', () => {
    expect(chooseMove([])).toEqual({ x: 7, y: 7 });
  });

  it('2手目は初手の隣に打つ', () => {
    const p = chooseMove(pts([7, 7]));
    expect(Math.max(Math.abs(p.x - 7), Math.abs(p.y - 7))).toBe(1);
  });

  it('自分が4つ並んでいれば勝ちの手を打つ', () => {
    // 黒番。黒 (3..6,7) の片側は白で塞がれている
    const moves = interleave(pts([3, 7], [4, 7], [5, 7], [6, 7], [0, 0]), pts([2, 7], [3, 8], [4, 8], [5, 8], [0, 14]));
    expect(chooseMove(moves)).toEqual({ x: 7, y: 7 });
  });

  it('飛び石の4つ（X X _ X X）の間を埋めて勝つ', () => {
    const moves = interleave(pts([3, 7], [4, 7], [6, 7], [7, 7]), pts([3, 3], [5, 3], [7, 3], [9, 3]));
    expect(chooseMove(moves)).toEqual({ x: 5, y: 7 });
  });

  it('相手の4つを止める', () => {
    // 白番。黒 (3..6,7) が並び、左端は白で塞がれている
    const moves = interleave(pts([3, 7], [4, 7], [5, 7], [6, 7]), pts([2, 7], [10, 10], [12, 12]));
    expect(chooseMove(moves)).toEqual({ x: 7, y: 7 });
  });

  it('相手の飛び石の4つ（X X _ X X）の間を止める', () => {
    const moves = interleave(pts([3, 7], [4, 7], [6, 7], [7, 7]), pts([10, 10], [12, 12], [10, 12]));
    expect(chooseMove(moves)).toEqual({ x: 5, y: 7 });
  });

  it('相手の4つを止めるより、自分の勝ちを優先する', () => {
    // 白番。黒 (3..6,7) も白 (3..6,10) も4つ並んでいる
    const moves = interleave(pts([3, 7], [4, 7], [5, 7], [6, 7], [0, 0]), pts([3, 10], [4, 10], [5, 10], [6, 10]));
    const p = chooseMove(moves);
    expect([pts([2, 10])[0], pts([7, 10])[0]]).toContainEqual(p);
  });

  it('相手の両端が空いた3つ（活三）を端で止める', () => {
    // 白番。黒 (5..7,7) は両端が空いている
    const moves = interleave(pts([5, 7], [6, 7], [7, 7]), pts([5, 9], [12, 2]));
    const p = chooseMove(moves);
    expect([pts([4, 7])[0], pts([8, 7])[0]]).toContainEqual(p);
  });

  it('相手の活三を止めるより、自分の活四を作る', () => {
    // 白番。白 (5..7,10) が活三、黒 (5..7,4) も活三
    const moves = interleave(pts([5, 4], [6, 4], [7, 4], [0, 0]), pts([5, 10], [6, 10], [7, 10]));
    const p = chooseMove(moves);
    expect([pts([4, 10])[0], pts([8, 10])[0]]).toContainEqual(p);
  });
});
