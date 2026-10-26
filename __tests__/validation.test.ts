import { validateFile, extensionOf, MAX_FILE_BYTES } from '../src/lib/validation';
describe('validation', () => {
  it('accepts pdf and common images', () => { expect(validateFile({name:'Passport.pdf',sizeBytes:1000}).ok).toBe(true); expect(validateFile({name:'nic.JPG',sizeBytes:1000}).ok).toBe(true); expect(validateFile({name:'a.png',sizeBytes:1000}).extension).toBe('png'); });
  it('rejects unsupported types', () => { const r = validateFile({name:'x.exe',sizeBytes:10}); expect(r.ok).toBe(false); expect(r.error).toMatch(/not supported/); });
  it('rejects oversized and empty files', () => { expect(validateFile({name:'a.pdf',sizeBytes:MAX_FILE_BYTES+1}).ok).toBe(false); expect(validateFile({name:'a.pdf',sizeBytes:0}).ok).toBe(false); });
  it('handles names without extension', () => { expect(extensionOf('noext')).toBe(''); expect(validateFile({name:'noext',sizeBytes:10}).ok).toBe(false); });
});
