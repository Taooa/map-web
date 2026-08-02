import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Result } from '@/domain/shared';

interface ExampleError {
  readonly code: 'EXAMPLE_ERROR';
}

describe('result domain', () => {
  it('discriminates success and failure results', () => {
    const success: Result<number, ExampleError> = {
      status: 'success',
      value: 42,
    };
    const failure: Result<number, ExampleError> = {
      status: 'failure',
      error: { code: 'EXAMPLE_ERROR' },
    };

    expect(success.status).toBe('success');
    expect(failure.status).toBe('failure');

    if (success.status === 'success') {
      expectTypeOf(success.value).toBeNumber();
    }

    if (failure.status === 'failure') {
      expect(failure.error.code).toBe('EXAMPLE_ERROR');
    }
  });
});
