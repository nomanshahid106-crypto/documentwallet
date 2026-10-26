const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function generateDocCode(rand: () => number = Math.random): string {
  const part = () => Array.from({length: 4}, () => CHARS[Math.floor(rand() * CHARS.length) % CHARS.length]).join('');
  return `${part()}-${part()}`;
}
export function isValidDocCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code);
}
