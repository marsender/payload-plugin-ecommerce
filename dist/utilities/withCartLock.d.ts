import type { DefaultDocumentIDType, PayloadRequest } from 'payload';
export type CartLockOptions = {
    /** How often a waiter retries the lock. */
    pollIntervalMs?: number;
    /** How long a waiter retries before giving up with an error. */
    timeoutMs?: number;
};
/**
 * Runs `fn` while holding an exclusive, transaction-scoped lock on a cart, inside a database
 * transaction on `req`. A second caller for the same cart gets the lock only after the first has
 * committed, so everything the first one wrote is visible to it.
 *
 * This is what makes a "find the pending row, create it if missing" sequence safe against
 * concurrent requests: without it both requests find nothing and both create. Every database call
 * inside `fn` must pass `req`, or it runs on another connection, outside the lock.
 *
 * **Waiting holds no connection.** A waiter does not block inside Postgres
 * (`pg_advisory_xact_lock`): it tries `pg_try_advisory_xact_lock`, and on failure rolls its
 * transaction back — returning the connection to the pool — before sleeping and trying again. A
 * blocking wait would pin one pooled connection per waiter, and once waiters filled the pool, a
 * holder whose `fn` needed a second connection could never get one: every database call in the
 * application would hang. The holder itself still keeps its one connection for the length of `fn`,
 * so keep `fn` to the work that genuinely needs serialising.
 *
 * If `req` already carries a transaction, the lock joins it and is released when the caller
 * commits or rolls back, which is still the right moment: that is when the rows become visible. A
 * waiter in that case cannot give back a connection it does not own, and keeps it while it retries.
 *
 * After `timeoutMs` a waiter throws rather than waiting forever.
 *
 * Postgres only. On any other adapter, or with transactions disabled, `fn` runs unguarded (a
 * transaction-scoped lock taken outside a transaction would be released at the end of its own
 * statement).
 */
export declare const withCartLock: <T>(req: PayloadRequest, cartID: DefaultDocumentIDType, fn: () => Promise<T>, options?: CartLockOptions) => Promise<T>;
//# sourceMappingURL=withCartLock.d.ts.map