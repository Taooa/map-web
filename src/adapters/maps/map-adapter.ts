export interface MapRenderPoint {
  readonly id: string;
  readonly name: string;
  readonly position: readonly [lng: number, lat: number];
  readonly originalCoordinate: string;
  readonly displaySystem: string;
}

export interface MapAdapter {
  mount(container: HTMLElement, credential: string): Promise<void>;
  setPoints(points: readonly MapRenderPoint[]): void;
  fitView(): void;
  clear(): void;
  destroy(): void;
}
