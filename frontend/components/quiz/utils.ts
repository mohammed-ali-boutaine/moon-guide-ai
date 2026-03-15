/** Simple unique id for client-side list keys (no external lib needed). */
let _counter = 0;
export function nanoid(): string {
  return `local-${Date.now()}-${++_counter}`;
}
