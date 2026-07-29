declare const brandSymbol: unique symbol;

/**
 * Creates a nominal type without changing its runtime representation.
 */
export type Brand<Value, Name extends string> = Value & {
  readonly [brandSymbol]: Name;
};

export type PointId = Brand<string, 'PointId'>;
export type ImportRecordId = Brand<string, 'ImportRecordId'>;
export type IsoDateTime = Brand<string, 'IsoDateTime'>;
