import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AlgorithmId,
  AlgorithmVersion,
  IsoDateTime,
  PointId,
  TransformationPathSignature,
} from '@/domain/shared';
import type { Point } from '@/domain/points';

const createdAt = '2026-07-29T02:00:00.000Z' as IsoDateTime;

describe('point domain', () => {
  it('defines the minimal point structure', () => {
    const point: Point = {
      id: 'point-1' as PointId,
      name: '设备点位 1',
      source: {
        type: 'manual',
      },
      coordinates: {
        original: {
          kind: 'geographic',
          system: 'WGS84',
          unit: 'degree',
          lng: 121.4737,
          lat: 31.2304,
        },
        converted: {},
      },
      createdAt,
      updatedAt: createdAt,
    };

    expect(point).toEqual({
      id: 'point-1',
      name: '设备点位 1',
      source: { type: 'manual' },
      coordinates: {
        original: {
          kind: 'geographic',
          system: 'WGS84',
          unit: 'degree',
          lng: 121.4737,
          lat: 31.2304,
        },
        converted: {},
      },
      createdAt,
      updatedAt: createdAt,
    });
    expectTypeOf(point.coordinates.original).toMatchTypeOf<Point['coordinates']['original']>();
  });

  it('separates the original coordinate from converted cache entries', () => {
    const original = {
      kind: 'geographic',
      system: 'WGS84',
      unit: 'degree',
      lng: 121.4737,
      lat: 31.2304,
    } as const;
    const point: Point = {
      id: 'point-2' as PointId,
      name: '设备点位 2',
      source: {
        type: 'manual',
      },
      coordinates: {
        original,
        converted: {
          GCJ02: {
            coordinate: {
              kind: 'geographic',
              system: 'GCJ02',
              unit: 'degree',
              lng: 121.478,
              lat: 31.228,
            },
            transformation: {
              generatedAt: createdAt,
              pathSignature: 'wgs84-gcj02:v1' as TransformationPathSignature,
              steps: [
                {
                  algorithmId: 'gcoord-wgs84-gcj02' as AlgorithmId,
                  algorithmVersion: '1.0.0' as AlgorithmVersion,
                  source: 'WGS84',
                  target: 'GCJ02',
                  status: 'verified',
                },
              ],
            },
          },
        },
      },
      createdAt,
      updatedAt: createdAt,
    };

    expect(point.coordinates.original).toBe(original);
    expect(point.coordinates.converted.GCJ02?.coordinate.system).toBe('GCJ02');
    expect(point.coordinates.converted.GCJ02?.coordinate).not.toBe(point.coordinates.original);
  });
});
