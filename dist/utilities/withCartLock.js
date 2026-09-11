import { commitTransaction, initTransaction, killTransaction } from 'payload';
/**
 * First key of the two-key advisory lock ('ECOM'), so these locks cannot collide with any other
 * advisory lock taken on the same numeric ids.
 */ const LOCK_NAMESPACE = 0x45434f4d;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 100;
/**
 * Maps a document id onto the int4 second key of the advisory lock, from its string form, so the
 * numeric `42` a hook holds and the `'42'` a route reads from its URL take the same lock. FNV-1a;
 * a collision only makes two unrelated carts wait for each other, never lets two holders of the
 * same cart through.
 */ const toLockKey = (id)=>{
    let hash = 0x811c9dc5;
    for (const char of String(id)){
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash | 0;
};
const sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));
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
 */ export const withCartLock = async (req, cartID, fn, options = {})=>{
    const db = req.payload.db;
    if (db.name !== 'postgres' || typeof db.execute !== 'function') {
        return fn();
    }
    const execute = db.execute;
    const { pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
    const deadline = Date.now() + timeoutMs;
    const lockKey = toLockKey(cartID);
    for(;;){
        const startedHere = await initTransaction(req);
        const transactionID = req.transactionID ? await req.transactionID : undefined;
        const session = transactionID !== undefined ? db.sessions?.[transactionID] : undefined;
        if (!session) {
            return fn();
        }
        let locked;
        try {
            const result = await execute({
                db: session.db,
                raw: `SELECT pg_try_advisory_xact_lock(${LOCK_NAMESPACE}, ${lockKey}) AS locked`
            });
            const row = result?.rows?.[0];
            if (typeof row?.locked !== 'boolean') {
                throw new Error('Unexpected result from pg_try_advisory_xact_lock');
            }
            locked = row.locked;
        } catch (error) {
            if (startedHere) {
                await killTransaction(req);
            }
            throw error;
        }
        if (locked) {
            try {
                const result = await fn();
                if (startedHere) {
                    await commitTransaction(req);
                }
                return result;
            } catch (error) {
                if (startedHere) {
                    await killTransaction(req);
                }
                throw error;
            }
        }
        if (startedHere) {
            await killTransaction(req);
        }
        if (Date.now() >= deadline) {
            throw new Error(`Timed out after ${timeoutMs} ms waiting for the lock on cart ${String(cartID)}`);
        }
        await sleep(pollIntervalMs);
    }
};

//# sourceMappingURL=withCartLock.js.map