export const coordinateSystemIds = ['WGS84', 'GCJ02', 'BD09', 'SHANGHAI2000', 'CGCS2000'] as const;

export type CoordinateSystemId = (typeof coordinateSystemIds)[number];

export type GeographicCoordinateSystemId = Exclude<CoordinateSystemId, 'SHANGHAI2000'>;
export type ProjectedCoordinateSystemId = Extract<CoordinateSystemId, 'SHANGHAI2000'>;
export type CoordinateSystemKind = 'geographic' | 'projected';
export type CoordinateSystemStatus = 'supported' | 'experimental' | 'disabled';
export type CoordinateUnit = 'degree' | 'metre';

export interface CoordinateSystemDefinition<
  Id extends CoordinateSystemId = CoordinateSystemId,
  Kind extends CoordinateSystemKind = CoordinateSystemKind,
> {
  readonly id: Id;
  readonly label: string;
  readonly kind: Kind;
  readonly unit: CoordinateUnit;
  readonly status: CoordinateSystemStatus;
  /**
   * Whether the product may present this system in its standard V1 entry list.
   * Availability still depends on `status`; experimental systems must be gated.
   */
  readonly defaultUserEntry: boolean;
}

export type CoordinateSystemDefinitionRegistry = Readonly<{
  [Id in CoordinateSystemId]: CoordinateSystemDefinition<Id>;
}>;

/**
 * Domain-level availability metadata only. It does not register any algorithm.
 *
 * Shanghai 2000 remains experimental until projection parameters and precision
 * are verified. CGCS2000 is an experimental extension and is never a default
 * user entry.
 */
export const coordinateSystemDefinitions = {
  WGS84: {
    id: 'WGS84',
    label: 'WGS84',
    kind: 'geographic',
    unit: 'degree',
    status: 'supported',
    defaultUserEntry: true,
  },
  GCJ02: {
    id: 'GCJ02',
    label: 'GCJ02',
    kind: 'geographic',
    unit: 'degree',
    status: 'supported',
    defaultUserEntry: true,
  },
  BD09: {
    id: 'BD09',
    label: 'BD09',
    kind: 'geographic',
    unit: 'degree',
    status: 'supported',
    defaultUserEntry: true,
  },
  SHANGHAI2000: {
    id: 'SHANGHAI2000',
    label: '上海2000',
    kind: 'projected',
    unit: 'metre',
    status: 'experimental',
    defaultUserEntry: true,
  },
  CGCS2000: {
    id: 'CGCS2000',
    label: 'CGCS2000',
    kind: 'geographic',
    unit: 'degree',
    status: 'experimental',
    defaultUserEntry: false,
  },
} as const satisfies CoordinateSystemDefinitionRegistry;
