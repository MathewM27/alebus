/**
 * Boot readiness signal for coordinating splash screen lifecycle.
 *
 * Resolving this promise tells the root layout that the app's
 * async initialization (storage reads, auth check) is complete
 * and the splash can safely be hidden.
 *
 * Multiple calls to setBootReady() are safe — only the first resolves.
 *
 * Consumed by:  app/_layout.tsx  (awaits bootReadyPromise)
 * Produced by:  app/index.tsx    (primary — after redirect decision)
 *               AuthContext.tsx   (fallback — covers deep-link scenarios)
 */

let _resolve: () => void;
let _called = false;

export const bootReadyPromise = new Promise<void>((resolve) => {
  _resolve = resolve;
});

export function setBootReady(): void {
  if (!_called) {
    _called = true;
    _resolve();
  }
}
