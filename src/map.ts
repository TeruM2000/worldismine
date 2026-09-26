import { geoArea, geoCentroid, geoDistance, geoNaturalEarth1, geoPath } from 'd3-geo';
import { select, type Selection } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Mastery } from './storage';

/** 地図の座標系の幅。画面サイズに関係なく、この座標で描いてズームで合わせる */
const BASE_WIDTH = 1000;
/** これより小さい国は丸で囲んで示す（地図座標での大きさ） */
const SMALL_SIZE = 5;
/** ズームしたとき、最低でもこの範囲は見えるようにする（周りの国も見えるように） */
const MIN_SPAN = 60;
/** 小さい国は周りが海だけになりやすいので、もっと広く見せる */
const MIN_SPAN_SMALL = 100;
/** 飛び地を「本体の近く」とみなす距離（ラジアン、約15度） */
const NEAR_PART = 0.26;
const MAX_ZOOM = 40;

type Bounds = [[number, number], [number, number]];

interface MapCountry {
  id: string;
  path: SVGPathElement;
  /** ズームするときに合わせる範囲（遠くの海外領土は除く） */
  focus: Bounds;
  /** 本体部分の中心（経度・緯度） */
  center: [number, number];
  small: boolean;
}

type CountryFeature = Feature<Polygon | MultiPolygon, { id: string }>;

export class WorldMap {
  private readonly svg: Selection<SVGSVGElement, unknown, null, undefined>;
  private readonly world: SVGGElement;
  private readonly marker: SVGCircleElement;
  private readonly countries = new Map<string, MapCountry>();
  private readonly zoomer: ZoomBehavior<SVGSVGElement, unknown>;
  private readonly height: number;
  private targetId: string | null = null;
  private k = 1;

  constructor(svgEl: SVGSVGElement, topo: Topology, quizIds: Set<string>) {
    const collection = feature(topo, topo.objects.countries as GeometryCollection<{ id: string }>);
    const projection = geoNaturalEarth1().fitWidth(BASE_WIDTH, { type: 'Sphere' });
    const path = geoPath(projection);
    this.height = path.bounds({ type: 'Sphere' })[1][1];

    this.svg = select(svgEl);
    const world = this.svg.append('g').attr('class', 'world');
    this.world = world.node()!;
    world.append('path').attr('class', 'sphere').attr('d', path({ type: 'Sphere' }));

    for (const f of collection.features as CountryFeature[]) {
      const id = f.properties.id;
      const el = world
        .append('path')
        .attr('d', path(f))
        .attr('class', quizIds.has(id) ? 'country m0' : 'country other')
        .node()!;
      if (!quizIds.has(id)) continue;
      const main = mainParts(f, path.bounds.bind(path));
      const focus = path.bounds(main);
      const small = Math.max(focus[1][0] - focus[0][0], focus[1][1] - focus[0][1]) < SMALL_SIZE;
      this.countries.set(id, { id, path: el, focus, center: geoCentroid(main), small });
    }

    this.marker = world.append('circle').attr('class', 'marker').attr('r', 0).node()!;

    this.zoomer = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, MAX_ZOOM])
      .on('zoom', (e: D3ZoomEvent<SVGSVGElement, unknown>) => this.applyTransform(e.transform));
    this.svg.call(this.zoomer).on('dblclick.zoom', null);
    this.resize();
  }

  /** 画面サイズが変わったときに呼ぶ */
  resize(): void {
    const { width, height } = this.svgSize();
    const fit = Math.min(width / BASE_WIDTH, height / this.height);
    this.zoomer
      .extent([[0, 0], [width, height]])
      .scaleExtent([fit * 0.9, fit * MAX_ZOOM])
      .translateExtent([[-BASE_WIDTH * 0.1, -this.height * 0.1], [BASE_WIDTH * 1.1, this.height * 1.1]]);
    if (this.targetId) this.focus(this.targetId, false);
    else this.showWorld(false);
  }

  distance(a: string, b: string): number {
    return geoDistance(this.countries.get(a)!.center, this.countries.get(b)!.center);
  }

  setMastery(id: string, mastery: Mastery): void {
    const c = this.countries.get(id);
    if (!c) return;
    const highlighted = c.path.classList.contains('target');
    c.path.setAttribute('class', `country m${mastery}${highlighted ? ' target' : ''}`);
  }

  /** 出題する国をハイライトしてズームする */
  focus(id: string, animate = true): void {
    if (this.targetId && this.targetId !== id) this.countries.get(this.targetId)?.path.classList.remove('target');
    this.targetId = id;
    const c = this.countries.get(id)!;
    c.path.classList.add('target');
    // 国境線が隣の国に隠れないよう、最前面に出す
    this.world.insertBefore(c.path, this.marker);

    if (c.small) {
      const [[x0, y0], [x1, y1]] = c.focus;
      this.marker.setAttribute('cx', String((x0 + x1) / 2));
      this.marker.setAttribute('cy', String((y0 + y1) / 2));
    }
    this.marker.classList.toggle('visible', c.small);
    this.updateMarker();
    this.zoomTo(c.focus, animate, c.small ? MIN_SPAN_SMALL : MIN_SPAN);
  }

  showWorld(animate = true): void {
    this.zoomTo([[0, 0], [BASE_WIDTH, this.height]], animate, MIN_SPAN, 1);
  }

  private zoomTo([[x0, y0], [x1, y1]]: Bounds, animate: boolean, minSpan: number, fill = 0.55): void {
    const { width, height } = this.svgSize();
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const dx = Math.max(x1 - x0, minSpan);
    const dy = Math.max(y1 - y0, minSpan * 0.6);
    const [minK, maxK] = this.zoomer.scaleExtent();
    const k = Math.max(minK, Math.min(maxK, fill / Math.max(dx / width, dy / height)));
    const t = zoomIdentity.translate(width / 2 - k * cx, height / 2 - k * cy).scale(k);
    if (animate) this.svg.transition().duration(750).call(this.zoomer.transform, t);
    else this.svg.call(this.zoomer.transform, t);
  }

  private applyTransform(t: ZoomTransform): void {
    this.k = t.k;
    this.world.setAttribute('transform', t.toString());
    this.updateMarker();
  }

  /** 丸の大きさは、ズームしても画面上で同じ大きさに保つ */
  private updateMarker(): void {
    this.marker.setAttribute('r', String(16 / this.k));
  }

  private svgSize(): { width: number; height: number } {
    const r = this.svg.node()!.getBoundingClientRect();
    return { width: r.width || 1, height: r.height || 1 };
  }
}

/**
 * 一番大きい陸地と、その近くの島だけを取り出す。
 * フランスの海外県やアメリカのアラスカなど、遠くの領土までズーム範囲に入ると国が小さくなりすぎるため。
 */
function mainParts(f: CountryFeature, bounds: (g: Polygon) => Bounds): Polygon | MultiPolygon {
  if (f.geometry.type === 'Polygon') return f.geometry;
  const parts: Polygon[] = f.geometry.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }));
  const largest = parts.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
  const center = geoCentroid(largest);
  const [[lx0], [lx1]] = bounds(largest);
  const near = parts.filter((p) => {
    if (p === largest) return true;
    if (geoDistance(center, geoCentroid(p)) > NEAR_PART) return false;
    // 日付変更線の反対側に描かれる島は、地図上では遠く離れるので除く
    const [[x0], [x1]] = bounds(p);
    return Math.max(x1, lx1) - Math.min(x0, lx0) < BASE_WIDTH / 3;
  });
  return { type: 'MultiPolygon', coordinates: near.map((p) => p.coordinates) };
}
