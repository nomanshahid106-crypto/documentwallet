export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_EXTENSIONS = ['pdf','jpg','jpeg','png','webp','heic'] as const;
export interface FileCandidate { name: string; sizeBytes: number; mimeType?: string }
export interface ValidationResult { ok: boolean; extension: string; error?: string }
export function extensionOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : '';
}
export function validateFile(f: FileCandidate): ValidationResult {
  const ext = extensionOf(f.name);
  if (!ext) return { ok: false, extension: ext, error: 'File has no extension. Only PDF and image files are supported.' };
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext))
    return { ok: false, extension: ext, error: `".${ext}" files are not supported. Use PDF, JPG, PNG, WEBP or HEIC.` };
  if (!f.sizeBytes || f.sizeBytes <= 0) return { ok: false, extension: ext, error: 'File appears to be empty.' };
  if (f.sizeBytes > MAX_FILE_BYTES) return { ok: false, extension: ext, error: 'File is larger than 25 MB.' };
  return { ok: true, extension: ext };
}
