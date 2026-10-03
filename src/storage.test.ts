import { describe, expect, it } from 'vitest';
import { parseSavedGame } from './storage';

describe('parseSavedGame', () => {
  it('正しいデータを読み込める', () => {
    const game = { moves: [{ x: 7, y: 7 }, { x: 8, y: 8 }], human: 'white' };
    expect(parseSavedGame(JSON.stringify(game))).toEqual(game);
  });

  it.each([
    ['空', null],
    ['JSON でない', '{'],
    ['手番の色が不正', JSON.stringify({ moves: [], human: 'red' })],
    ['盤の外の手', JSON.stringify({ moves: [{ x: 15, y: 0 }], human: 'black' })],
    ['小数の座標', JSON.stringify({ moves: [{ x: 1.5, y: 0 }], human: 'black' })],
    ['同じマスに2回', JSON.stringify({ moves: [{ x: 1, y: 1 }, { x: 1, y: 1 }], human: 'black' })],
  ])('%s なら読み込まない', (_, json) => {
    expect(parseSavedGame(json)).toBeNull();
  });
});
