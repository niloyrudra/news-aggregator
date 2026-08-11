/**
 * Shared HTTP concerns for all news providers — per agent-skills/02 rule 3.
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

export class HttpError extends Error {
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
  /** Max attempts including the first. Spec: max 2. */
  maxAttempts?: number;
  /** Initial backoff in ms; doubled each attempt. */
  initialBackoffMs?: number;
}

export class BaseHttpProvider {
  protected readonly timeoutMs: number;
  protected readonly maxAttempts: number;
  protected readonly initialBackoffMs: number;

  constructor(options: BaseHttpProviderOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxAttempts = options.maxAttempts ?? 2;
    this.initialBackoffMs = options.initialBackoffMs ?? 250;
  }

  /**
   * Fetch JSON with timeout + retry. Throws `HttpError` on failure.
   * Accepts an external `signal` so callers (e.g. TanStack Query) can cancel
   * stale requests — see 04-security-and-reliability.md rule 4.
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
        if (err instanceof HttpError && err.isClientError) {
          // 4xx — don't retry, surface immediately.
          throw err;
        }
        if (err instanceof DOMException && err.name === 'AbortError' && externalSignal?.aborted) {
          // Caller asked to abort — propagate without retrying.
          throw new HttpError('Request aborted', 'aborted');
        }
        lastError = err instanceof HttpError ? err : new HttpError('Network error', 'network');
        if (attempt < this.maxAttempts) {
          await this.backoff(attempt, externalSignal);
        }
      }
    }

    throw lastError ?? new HttpError('Request failed', 'network');
  }

  private async attempt<T>(
    url: string,
    init: RequestInit,
    externalSignal?: AbortSignal,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

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
        // Distinguish caller-cancel from our timeout using the timeout id state.
        // If the controller was aborted by the timeout, surface as 'timeout'.
        // If by the external signal, the caller will catch the AbortError above
        // via the isClientError path — but we still need to label it correctly.
        if (externalSignal?.aborted) {
          throw new HttpError('Request aborted', 'aborted');
        }
        throw new HttpError(`Request timed out after ${this.timeoutMs}ms`, 'timeout');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  private async backoff(attempt: number, externalSignal?: AbortSignal): Promise<void> {
    const delay = this.initialBackoffMs * 2 ** (attempt - 1);
    await new Promise<void>((resolve, reject) => {
      const id = setTimeout(resolve, delay);
      if (externalSignal) {
        const onAbort = () => {
          clearTimeout(id);
          reject(new HttpError('Request aborted', 'aborted'));
        };
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
