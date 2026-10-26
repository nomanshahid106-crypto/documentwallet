import { generateDocCode, isValidDocCode } from '../src/lib/docCode';
describe('docCode', () => {
  it('generates sample-shaped codes like A7F3-9K2D', () => { for (let i = 0; i < 50; i++) expect(isValidDocCode(generateDocCode())).toBe(true); });
  it('never uses ambiguous characters 0 O 1 I', () => { for (let i = 0; i < 100; i++) expect(generateDocCode()).not.toMatch(/[01OI]/); });
  it('rejects malformed codes', () => { expect(isValidDocCode('A7F3-9K2')).toBe(false); expect(isValidDocCode('a7f3-9k2d')).toBe(false); expect(isValidDocCode('A7F39K2D')).toBe(false); });
  it('is deterministic with a seeded rand', () => { expect(generateDocCode(() => 0)).toBe('AAAA-AAAA'); });
});
