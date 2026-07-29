import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  coordinateSystemDefinitions,
  type AlgorithmId,
  type AlgorithmVersion,
  type Coordinate,
  type CoordinateSystemDefinition,
  type CoordinateSystemId,
  type CoordinateSystemStatus,
  type Result,
  type TransformationStep,
} from '@/domain';
import type {
  AlgorithmQuery,
  AlgorithmRegistry,
  CoordinateCoreError,
  CoordinateTransformationRequest,
  CoordinateSystemRegistry,
  CoordinateTransformer,
  TransformationAlgorithm,
  TransformationGraph,
  TransformationPathRequest,
  TransformationPathResult,
} from '@/core/coordinate';

function success<Value>(value: Value): Result<Value, CoordinateCoreError> {
  return {
    status: 'success',
    value,
  };
}

function failure(
  code: CoordinateCoreError['code'],
  message: string,
): Result<never, CoordinateCoreError> {
  return {
    status: 'failure',
    error: {
      code,
      message,
    },
  };
}

class FakeAlgorithmRegistry implements AlgorithmRegistry {
  readonly #algorithms = new Map<AlgorithmId, TransformationAlgorithm>();

  register(algorithm: TransformationAlgorithm): Result<void, CoordinateCoreError> {
    if (this.#algorithms.has(algorithm.id)) {
      return failure('ALGORITHM_UNAVAILABLE', 'Fake registry rejects duplicate identifiers.');
    }

    this.#algorithms.set(algorithm.id, algorithm);
    return success(undefined);
  }

  get(id: AlgorithmId): TransformationAlgorithm | undefined {
    return this.#algorithms.get(id);
  }

  find(query: AlgorithmQuery): readonly TransformationAlgorithm[] {
    return [...this.#algorithms.values()].filter(
      (algorithm) =>
        algorithm.source === query.source &&
        algorithm.target === query.target &&
        (algorithm.status === 'verified' ||
          (query.allowExperimental === true && algorithm.status === 'experimental')),
    );
  }

  list(): readonly TransformationAlgorithm[] {
    return [...this.#algorithms.values()];
  }
}

class FakeCoordinateSystemRegistry implements CoordinateSystemRegistry {
  readonly #definitions: readonly CoordinateSystemDefinition[] = Object.values(
    coordinateSystemDefinitions,
  );

  get(id: string): Result<CoordinateSystemDefinition, CoordinateCoreError> {
    const definition = this.#definitions.find((candidate) => candidate.id === id);

    return definition === undefined
      ? failure('UNSUPPORTED', `Unsupported coordinate system: ${id}`)
      : success(definition);
  }

  list(): readonly CoordinateSystemDefinition[] {
    return this.#definitions;
  }

  listByStatus(status: CoordinateSystemStatus): readonly CoordinateSystemDefinition[] {
    return this.#definitions.filter((definition) => definition.status === status);
  }

  isDefaultUserEntry(id: CoordinateSystemId): boolean {
    return this.#definitions.some(
      (definition) => definition.id === id && definition.defaultUserEntry,
    );
  }
}

class FakeTransformationGraph implements TransformationGraph {
  readonly #paths = new Map<string, readonly TransformationStep[]>();

  describe(
    source: CoordinateSystemId,
    target: CoordinateSystemId,
    steps: readonly TransformationStep[],
  ): void {
    this.#paths.set(`${source}->${target}`, steps);
  }

  findPath(request: TransformationPathRequest): TransformationPathResult {
    const path = this.#paths.get(`${request.source}->${request.target}`);

    return path === undefined
      ? failure('NO_PATH', 'Fake graph has no described path.')
      : success(path);
  }
}

const fakeAlgorithm: TransformationAlgorithm = {
  id: 'fake-wgs84-gcj02' as AlgorithmId,
  source: 'WGS84',
  target: 'GCJ02',
  version: 'fake-1' as AlgorithmVersion,
  status: 'verified',
  execute(coordinate: Coordinate) {
    return Promise.resolve(success(coordinate));
  },
};

describe('Coordinate Core contracts', () => {
  it('allows an AlgorithmRegistry fake to register and query contracts', () => {
    const registry: AlgorithmRegistry = new FakeAlgorithmRegistry();

    expect(registry.register(fakeAlgorithm)).toEqual(success(undefined));
    expect(registry.get(fakeAlgorithm.id)).toBe(fakeAlgorithm);
    expect(registry.find({ source: 'WGS84', target: 'GCJ02' })).toEqual([fakeAlgorithm]);
  });

  it('allows a TransformationGraph fake to describe a path without executing it', () => {
    const graph = new FakeTransformationGraph();
    const step: TransformationStep = {
      algorithmId: fakeAlgorithm.id,
      algorithmVersion: fakeAlgorithm.version,
      source: fakeAlgorithm.source,
      target: fakeAlgorithm.target,
      status: fakeAlgorithm.status,
    };

    graph.describe('WGS84', 'GCJ02', [step]);

    expect(graph.findPath({ source: 'WGS84', target: 'GCJ02' })).toEqual(success([step]));
    expect(graph.findPath({ source: 'WGS84', target: 'BD09' })).toEqual(
      failure('NO_PATH', 'Fake graph has no described path.'),
    );
  });

  it('returns a structured unsupported result for an unknown system', () => {
    const registry: CoordinateSystemRegistry = new FakeCoordinateSystemRegistry();

    expect(registry.get('EPSG:9999')).toEqual(
      failure('UNSUPPORTED', 'Unsupported coordinate system: EPSG:9999'),
    );
    expect(registry.listByStatus('supported').map((definition) => definition.id)).toEqual([
      'WGS84',
      'GCJ02',
      'BD09',
    ]);
    expect(registry.isDefaultUserEntry('CGCS2000')).toBe(false);
  });

  it('keeps the transformer contract independent from a concrete algorithm', () => {
    expectTypeOf<CoordinateTransformer>().toHaveProperty('transform');
    expectTypeOf<
      Parameters<CoordinateTransformer['transform']>[0]
    >().toEqualTypeOf<CoordinateTransformationRequest>();
    expectTypeOf<TransformationAlgorithm['execute']>().toBeFunction();
  });
});
