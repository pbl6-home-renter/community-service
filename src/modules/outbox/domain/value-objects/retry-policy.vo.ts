import { InvalidRetryPolicyException } from '../exceptions/invalid-retry-policy.exception';

export interface RetryPolicyProps {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export class RetryPolicy {
  private constructor(
    readonly maxAttempts: number,
    readonly baseDelayMs: number,
    readonly maxDelayMs: number,
  ) {}

  static create(props: RetryPolicyProps): RetryPolicy {
    if (!Number.isInteger(props.maxAttempts) || props.maxAttempts < 1) {
      throw new InvalidRetryPolicyException(
        `maxAttempts must be an integer >= 1, got ${props.maxAttempts}`,
      );
    }
    if (!(props.baseDelayMs > 0) || !(props.baseDelayMs <= props.maxDelayMs)) {
      throw new InvalidRetryPolicyException(
        `require 0 < baseDelayMs <= maxDelayMs, got ${props.baseDelayMs} and ${props.maxDelayMs}`,
      );
    }
    return new RetryPolicy(
      props.maxAttempts,
      props.baseDelayMs,
      props.maxDelayMs,
    );
  }

  /** Counts every attempt, including the first: maxAttempts=1 means no retry. */
  isExhausted(attempts: number): boolean {
    return attempts >= this.maxAttempts;
  }

  delayFor(failedAttempts: number): number {
    return Math.min(
      this.maxDelayMs,
      this.baseDelayMs * 2 ** Math.max(0, failedAttempts - 1),
    );
  }

  equals(other: RetryPolicy): boolean {
    return (
      this.maxAttempts === other.maxAttempts &&
      this.baseDelayMs === other.baseDelayMs &&
      this.maxDelayMs === other.maxDelayMs
    );
  }
}
