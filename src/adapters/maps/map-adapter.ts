export interface MapRenderPoint {
  readonly id: string;
  readonly name: string;
  readonly position: readonly [lng: number, lat: number];
  readonly originalCoordinate: string;
  readonly displaySystem: string;
}

export interface MapRenderGroup {
  readonly key: string;
  readonly position: readonly [lng: number, lat: number];
  readonly points: readonly MapRenderPoint[];
  readonly activePointId: string | null;
}

export type MapPointActivateHandler = (pointId: string) => void;

export interface MapAdapterOptions {
  readonly onPointActivate?: MapPointActivateHandler;
}

export interface MapAdapter {
  mount(container: HTMLElement, credential: string): Promise<void>;
  setPoints(groups: readonly MapRenderGroup[]): void;
  focusPoint(position: readonly [lng: number, lat: number]): void;
  fitView(): void;
  clear(): void;
  destroy(): void;
}
