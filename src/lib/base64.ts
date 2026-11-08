/**
 * Standard base64 → Uint8Array decoding (base64-arraybuffer style).
 *
 * This replaces a hand-rolled decoder that accumulated bits in a JS number
 * with 32-bit bitwise shifts — that approach corrupts data once the buffer
 * overflows 32 bits. This implementation processes the input in fixed
 * 4-character groups into a pre-sized ArrayBuffer, so it is correct for
 * arbitrarily large payloads.
 */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Lookup table: ASCII code → 6-bit value ('=' and anything else maps to 0).
const LOOKUP = new Uint8Array(256);
for (let i = 0; i < CHARS.length; i++) LOOKUP[CHARS.charCodeAt(i)] = i;

export function decodeBase64(input: string): Uint8Array {
  // Tolerate whitespace / line breaks; ignore any other non-alphabet chars.
  const base64 = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = base64.length;
  if (len === 0) return new Uint8Array(0);

  let bufferLength = Math.floor((len * 3) / 4);
  if (base64[len - 1] === '=') {
    bufferLength--;
    if (len > 1 && base64[len - 2] === '=') bufferLength--;
  }

  const bytes = new Uint8Array(new ArrayBuffer(Math.max(0, bufferLength)));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = LOOKUP[base64.charCodeAt(i)];
    const encoded2 = LOOKUP[base64.charCodeAt(i + 1)];
    const encoded3 = LOOKUP[base64.charCodeAt(i + 2)];
    const encoded4 = LOOKUP[base64.charCodeAt(i + 3)];
    // Writes past the end of a Uint8Array are silently ignored, which is
    // exactly what handles the final padded group ('xx==' / 'xxx=').
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes;
}
