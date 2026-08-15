/**
 * Shared HTTP concerns for all news providers.
 *
 * Subclasses pass a URL + init and get a typed JSON response back. The base
 * class owns:
 *   - AbortController-based timeout
 *   - Retry on transient failures (timeout, 5xx) with capped exponential backoff
 *   - No retry on 4xx — those burn the daily quota, not a flaky connection
 *   - Error normalization into `HttpError` so providers can branch on cause
 *
 * Anything vendor-specific (URL building, response shape) stays in the subclass.
 */

/**
 * Normalized error for every failure mode the base provider can hit.
 *
 * `cause` here is a category discriminator (timeout / http / network / aborted),
 * NOT the standard `Error.cause`. This class is internal to this module, so the
 * shadowing is intentional and contained.
 */
class HttpError extends Error {
  readonly cause: 'timeout' | 'http' | 'network' | 'aborted';
  readonly status?: number;

  constructor(
    message: string,
    cause: 'timeout' | 'http' | 'network' | 'aborted',
    status?: number,
  ) {
    super(message);
    this.name = 'HttpError';
    this.cause = cause;
    this.status = status;
  }

  /** 4xx responses (bad key, rate limit) should not be retried. */
  get isClientError(): boolean {
    return this.cause === 'http' && this.status !== undefined && this.status >= 400 && this.status < 500;
  }
}

export interface BaseHttpProviderOptions {
  /** Per-attempt timeout in ms. */
  timeoutMs?: number;
  /** Max attempts including the first. Clamped to >= 1. */
  maxAttempts?: number;
  /** Initial backoff in ms; doubled each attempt. */
  initialBackoffMs?: number;
  /** Upper bound on the backoff delay in ms. */
  maxBackoffMs?: number;
}

export class BaseHttpProvider {
  protected readonly timeoutMs: number;
  protected readonly maxAttempts: number;
  protected readonly initialBackoffMs: number;
  protected readonly maxBackoffMs: number;

  constructor(options: BaseHttpProviderOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 2);
    this.initialBackoffMs = options.initialBackoffMs ?? 250;
    this.maxBackoffMs = options.maxBackoffMs ?? 2_000;
  }

  /**
   * Fetch JSON with timeout + retry. Throws `HttpError` on failure.
   * Accepts an external `signal` so callers (e.g. TanStack Query) can cancel
   * stale requests.
   */
  protected async getJson<T>(
    url: string,
    init: RequestInit = {},
    externalSignal?: AbortSignal,
  ): Promise<T> {
    let lastError: HttpError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.attempt<T>(url, init, externalSignal);
      } catch (err) {
        if (err instanceof HttpError) {
          // 4xx — don't retry, surface immediately (protects the daily quota).
          if (err.isClientError) {
            throw err;
          }
          // Caller asked to cancel — propagate without retrying, even if the
          // abort landed during backoff.
          if (err.cause === 'aborted') {
            throw err;
          }
          lastError = err;
        } else {
          // attempt() normalizes everything, but stay defensive.
          lastError = new HttpError(
            err instanceof Error ? err.message : 'Network error',
            'network',
          );
        }

        if (attempt < this.maxAttempts) {
          await this.backoff(attempt, externalSignal);
        }
      }
    }

    // maxAttempts is clamped to >= 1, so the loop always runs; the fallback
    // exists only to satisfy the type checker.
    throw lastError ?? new HttpError('Request failed', 'network');
  }

  private async attempt<T>(
    url: string,
    init: RequestInit,
    externalSignal?: AbortSignal,
  ): Promise<T> {
    const controller = new AbortController();

    // `timedOut` distinguishes our timeout from a caller-initiated abort:
    // the timeout sets it before aborting; a caller abort never does. This is
    // robust even when the timeout and a caller abort land in the same tick.
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    // Forward external cancellation into our controller.
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status} ${response.statusText}`,
          'http',
          response.status,
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        // The controller was aborted either by our timeout or the caller.
        throw timedOut
          ? new HttpError(`Request timed out after ${this.timeoutMs}ms`, 'timeout')
          : new HttpError('Request aborted', 'aborted');
      }
      // Network failure (TypeError) or JSON parse error — keep the message.
      throw new HttpError(
        err instanceof Error ? err.message : 'Network error',
        'network',
      );
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  private async backoff(attempt: number, externalSignal?: AbortSignal): Promise<void> {
    const delay = Math.min(
      this.initialBackoffMs * 2 ** (attempt - 1),
      this.maxBackoffMs,
    );

    await new Promise<void>((resolve, reject) => {
      // `id` is referenced by `onAbort`, but the closure is only invoked after
      // `id` is initialized below (timer callback or abort event listener), so
      // the temporal-dead-zone access is safe.
      const onAbort = () => {
        clearTimeout(id);
        reject(new HttpError('Request aborted', 'aborted'));
      };

      const id = setTimeout(() => {
        // Delay elapsed normally — drop the abort listener so it can't fire on
        // an already-settled promise later (and leak for the signal's lifetime).
        if (externalSignal) {
          externalSignal.removeEventListener('abort', onAbort);
        }
        resolve();
      }, delay);

      if (externalSignal) {
        if (externalSignal.aborted) {
          clearTimeout(id);
          reject(new HttpError('Request aborted', 'aborted'));
          return;
        }
        externalSignal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }
}