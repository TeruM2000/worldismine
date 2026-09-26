import type { Country } from './data/countries';

const CHOICE_COUNT = 8;
/** 間違いの選択肢は、近い順にこの数の国の中から選ぶ */
const NEIGHBOR_POOL = 14;
/** 不正解だった国を、何問後にもう一度出すか */
const RETRY_AFTER = [3, 6] as const;

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 出題順を管理する。全部出し終わったらシャッフルし直す */
export class Deck {
  private queue: Country[] = [];

  constructor(private readonly pool: Country[]) {}

  next(): Country {
    if (this.queue.length === 0) this.queue = shuffle(this.pool);
    return this.queue.shift()!;
  }

  /** 不正解の国を少し後に差し込む */
  retryLater(country: Country): void {
    const [min, max] = RETRY_AFTER;
    const at = Math.min(this.queue.length, min + Math.floor(Math.random() * (max - min + 1)));
    this.queue.splice(at, 0, country);
  }
}

/**
 * 正解1つ＋近くの国から選んだ間違い7つを、シャッフルして返す。
 * distance は2国の中心どうしの距離（ラジアン）を返す関数。
 */
export function makeChoices(
  answer: Country,
  candidates: Country[],
  distance: (a: Country, b: Country) => number,
): Country[] {
  const nearest = candidates
    .filter((c) => c.id !== answer.id)
    .map((c) => ({ c, d: distance(answer, c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, NEIGHBOR_POOL)
    .map(({ c }) => c);
  const wrong = shuffle(nearest).slice(0, CHOICE_COUNT - 1);
  return shuffle([answer, ...wrong]);
}
