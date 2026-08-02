export interface Success<Value> {
  readonly status: 'success';
  readonly value: Value;
}

export interface Failure<ErrorType> {
  readonly status: 'failure';
  readonly error: ErrorType;
}

export type Result<Value, ErrorType> = Success<Value> | Failure<ErrorType>;
