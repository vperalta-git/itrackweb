type ReasonRequest = { label: string; resolve: (reason: string | null) => void };
let listener: ((request: ReasonRequest) => void) | null = null;
let pendingResolve: ((reason: string | null) => void) | null = null;
export const setReasonRequestListener = (next: typeof listener) => { listener = next; if (!next) { pendingResolve?.(null); pendingResolve = null; } };
export const requestActionReason = (label: string) => new Promise<string | null>((resolve) => {
  if (!listener) return resolve(null);
  pendingResolve?.(null);
  const finish = (reason: string | null) => { if (pendingResolve === finish) pendingResolve = null; resolve(reason); };
  pendingResolve = finish;
  listener({ label, resolve: finish });
});
export type { ReasonRequest };
