import { BOARD_SIZE, type Point, type Stone } from './game';

export type SideChoice = Stone | 'random';
export type SavedGame = { moves: Point[]; human: Stone };

const GAME_KEY = 'gomoku:game:v1';
const SIDE_KEY = 'gomoku:side:v1';

const isStone = (v: unknown): v is Stone => v === 'black' || v === 'white';
const isCoord = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < BOARD_SIZE;

/** 壊れたデータや古い形式なら null を返す */
export function parseSavedGame(json: string | null): SavedGame | null {
  if (!json) return null;
  try {
    const data: unknown = JSON.parse(json);
    if (typeof data !== 'object' || data === null) return null;
    const { moves, human } = data as Record<string, unknown>;
    if (!isStone(human) || !Array.isArray(moves)) return null;
    const seen = new Set<number>();
    const points: Point[] = [];
    for (const m of moves) {
      if (typeof m !== 'object' || m === null) return null;
      const { x, y } = m as Record<string, unknown>;
      if (!isCoord(x) || !isCoord(y) || seen.has(y * BOARD_SIZE + x)) return null;
      seen.add(y * BOARD_SIZE + x);
      points.push({ x, y });
    }
    return { moves: points, human };
  } catch {
    return null;
  }
}

// localStorage は設定や状況によって使えないことがあるので、失敗しても遊べるようにする
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 保存できなくても対局は続けられる
  }
}

export const loadGame = (): SavedGame | null => parseSavedGame(read(GAME_KEY));
export const saveGame = (game: SavedGame): void => write(GAME_KEY, JSON.stringify(game));

export function loadSideChoice(): SideChoice {
  const v = read(SIDE_KEY);
  return isStone(v) || v === 'random' ? v : 'black';
}
export const saveSideChoice = (choice: SideChoice): void => write(SIDE_KEY, choice);
