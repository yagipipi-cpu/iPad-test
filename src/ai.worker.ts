import { chooseMove } from './ai';
import type { Point } from './game';

export type AiRequest = { id: number; moves: Point[] };
export type AiResponse = { id: number; move: Point };

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const response: AiResponse = { id: e.data.id, move: chooseMove(e.data.moves) };
  self.postMessage(response);
};
