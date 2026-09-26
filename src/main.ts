import type { Topology } from 'topojson-specification';
import { COUNTRIES, type Country } from './data/countries';
import { WorldMap } from './map';
import { Deck, makeChoices } from './quiz';
import { loadProgress, recordAnswer, type Progress } from './storage';
import './style.css';

const flagUrls = import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
});
const flagUrl = (id: string) => flagUrls[`/node_modules/flag-icons/flags/4x3/${id}.svg`];

const HINT_COUNT = 2;

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const els = {
  gold: $('#count-gold'),
  red: $('#count-red'),
  total: $('#count-total'),
  prompt: $('#prompt'),
  hints: $('#hints'),
  flag: $<HTMLImageElement>('#hint-flag'),
  capital: $('#hint-capital'),
  choices: $('#choices'),
  hintBtn: $<HTMLButtonElement>('#hint-btn'),
  nextBtn: $<HTMLButtonElement>('#next-btn'),
  worldBtn: $<HTMLButtonElement>('#world-btn'),
};

interface Round {
  answer: Country;
  hintLevel: number;
  answered: boolean;
}

async function start() {
  const topo = (await (await fetch(`${import.meta.env.BASE_URL}world.json`)).json()) as Topology;
  const progress = loadProgress();
  const map = new WorldMap($<SVGSVGElement & HTMLElement>('#map'), topo, new Set(COUNTRIES.map((c) => c.id)));
  for (const c of COUNTRIES) map.setMastery(c.id, progress[c.id]?.mastery ?? 0);
  new ResizeObserver(() => map.resize()).observe($('#map'));
  if (import.meta.env.DEV) Object.assign(window, { map });

  const deck = new Deck(COUNTRIES);
  let round: Round;

  els.total.textContent = String(COUNTRIES.length);
  updateCounts(progress);

  function nextRound() {
    round = { answer: deck.next(), hintLevel: 0, answered: false };
    els.prompt.textContent = 'この国はどこ？';
    els.prompt.className = 'prompt';
    showHints(0);
    els.hintBtn.hidden = false;
    els.nextBtn.hidden = true;
    renderHintButton();

    const choices = makeChoices(round.answer, COUNTRIES, (a, b) => map.distance(a.id, b.id));
    els.choices.replaceChildren(
      ...choices.map((c) => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.textContent = c.name;
        b.dataset.id = c.id;
        b.addEventListener('click', () => answer(c, b));
        return b;
      }),
    );
    map.focus(round.answer.id);
  }

  function answer(picked: Country, button: HTMLButtonElement) {
    if (round.answered) return;
    round.answered = true;
    const { answer } = round;
    const correct = picked.id === answer.id;
    const usedHint = round.hintLevel > 0;
    recordAnswer(progress, answer.id, correct, usedHint);

    for (const b of els.choices.querySelectorAll<HTMLButtonElement>('.choice')) {
      b.disabled = true;
      if (b.dataset.id === answer.id) b.classList.add('correct');
    }
    if (correct) {
      els.prompt.textContent = usedHint ? `正解！ ${answer.name}（赤で塗りました）` : `正解！ ${answer.name}（金で塗りました）`;
      els.prompt.className = `prompt ${usedHint ? 'is-red' : 'is-gold'}`;
    } else {
      button.classList.add('wrong');
      els.prompt.textContent = `ざんねん… 正解は ${answer.name}`;
      els.prompt.className = 'prompt is-wrong';
      deck.retryLater(answer);
    }

    // 答えたあとは覚えやすいよう、国旗と首都を全部見せる
    showHints(HINT_COUNT);
    map.setMastery(answer.id, progress[answer.id].mastery);
    updateCounts(progress);
    els.hintBtn.hidden = true;
    els.nextBtn.hidden = false;
    els.nextBtn.focus();
  }

  function showHints(level: number) {
    els.flag.src = flagUrl(round.answer.id);
    els.flag.hidden = level < 1;
    els.capital.textContent = `首都：${round.answer.capital}`;
    els.capital.hidden = level < 2;
    els.hints.hidden = level < 1;
  }

  function renderHintButton() {
    const left = HINT_COUNT - round.hintLevel;
    els.hintBtn.disabled = left === 0;
    els.hintBtn.textContent = left === 0 ? 'ヒントはもうありません' : `ヒント（残り${left}）`;
  }

  els.hintBtn.addEventListener('click', () => {
    if (round.answered || round.hintLevel >= HINT_COUNT) return;
    round.hintLevel++;
    showHints(round.hintLevel);
    renderHintButton();
  });
  els.nextBtn.addEventListener('click', nextRound);
  els.worldBtn.addEventListener('click', () => map.showWorld());

  nextRound();
}

function updateCounts(progress: Progress) {
  let gold = 0;
  let red = 0;
  for (const c of COUNTRIES) {
    const m = progress[c.id]?.mastery;
    if (m === 2) gold++;
    else if (m === 1) red++;
  }
  els.gold.textContent = String(gold);
  els.red.textContent = String(red);
}

start().catch((e) => {
  console.error(e);
  els.prompt.textContent = '地図の読み込みに失敗しました。再読み込みしてください。';
});
