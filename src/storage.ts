/** 0: まだ覚えていない（灰）, 1: ヒントありで正解（赤）, 2: ヒントなしで正解（金） */
export type Mastery = 0 | 1 | 2;

export interface CountryRecord {
  mastery: Mastery;
  correct: number;
  wrong: number;
  lastSeen: number;
}

export type Progress = Record<string, CountryRecord>;

const KEY = 'worldismine:progress:v1';

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // 保存できない環境（プライベートブラウズなど）ではその場限りの進捗になる
  }
}

export function recordOf(progress: Progress, id: string): CountryRecord {
  return (progress[id] ??= { mastery: 0, correct: 0, wrong: 0, lastSeen: 0 });
}

/** 回答結果を記録する。色は上がることはあっても下がることはない */
export function recordAnswer(progress: Progress, id: string, correct: boolean, usedHint: boolean): void {
  const r = recordOf(progress, id);
  r.lastSeen = Date.now();
  if (correct) {
    r.correct++;
    const earned: Mastery = usedHint ? 1 : 2;
    if (earned > r.mastery) r.mastery = earned;
  } else {
    r.wrong++;
  }
  saveProgress(progress);
}
