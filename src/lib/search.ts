export function escapeIlike(input: string) {
  return input.replace(/[%_]/g, (m) => `\\${m}`);
}
