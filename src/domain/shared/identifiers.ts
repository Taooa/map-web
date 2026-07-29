declare const brandSymbol: unique symbol;

/**
 * Creates a nominal type without changing its runtime representation.
 */
export type Brand<Value, Name extends string> = Value & {
  readonly [brandSymbol]: Name;
};

export type PointId = Brand<string, 'PointId'>;
export type ImportRecordId = Brand<string, 'ImportRecordId'>;
export type AlgorithmId = Brand<string, 'AlgorithmId'>;
export type AlgorithmVersion = Brand<string, 'AlgorithmVersion'>;
export type TransformationPathSignature = Brand<string, 'TransformationPathSignature'>;
export type IsoDateTime = Brand<string, 'IsoDateTime'>;
