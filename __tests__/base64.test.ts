import { decodeBase64 } from '../src/lib/base64';

/** Deterministic pseudo-random bytes (LCG) so the large test is stable. */
function pseudoRandomBytes(n: number, seed = 42): Buffer {
  const buf = Buffer.alloc(n);
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    buf[i] = (s >> 16) & 0xff;
  }
  return buf;
}

function roundTrip(original: Buffer) {
  const b64 = original.toString('base64');
  const decoded = decodeBase64(b64);
  expect(decoded.length).toBe(original.length);
  expect(Buffer.from(decoded)).toEqual(original);
}

describe('decodeBase64', () => {
  it('decodes an empty string to zero bytes', () => {
    expect(decodeBase64('')).toEqual(new Uint8Array(0));
    roundTrip(Buffer.alloc(0));
  });

  it("round-trips 'hello'", () => {
    roundTrip(Buffer.from('hello', 'utf8'));
    expect(Buffer.from(decodeBase64('aGVsbG8='))).toEqual(Buffer.from('hello', 'utf8'));
  });

  it('round-trips all 256 byte values', () => {
    roundTrip(Buffer.from(Array.from({ length: 256 }, (_, i) => i)));
  });

  it('round-trips a 150 KB pseudo-random buffer (deterministic seed)', () => {
    roundTrip(pseudoRandomBytes(150 * 1024));
  });

  it("handles '=' padding: 1-byte and 2-byte remainders", () => {
    // 'f'  -> 'Zg=='  (two pad chars)
    expect(Buffer.from(decodeBase64('Zg=='))).toEqual(Buffer.from('f', 'utf8'));
    // 'fo' -> 'Zm8='  (one pad char)
    expect(Buffer.from(decodeBase64('Zm8='))).toEqual(Buffer.from('fo', 'utf8'));
    // 'foo' -> 'Zm9v' (no padding)
    expect(Buffer.from(decodeBase64('Zm9v'))).toEqual(Buffer.from('foo', 'utf8'));
    roundTrip(Buffer.from([0x66]));
    roundTrip(Buffer.from([0x66, 0x6f]));
    roundTrip(Buffer.from([0x66, 0x6f, 0x6f]));
  });

  it('matches Buffer decoding on the known corruption-prone long inputs', () => {
    // Lengths that pushed the old 32-bit bit-shift decoder into corruption.
    for (const n of [1024, 4097, 65536]) roundTrip(pseudoRandomBytes(n, 7));
  });
});
