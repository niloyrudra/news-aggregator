/**
 * Simple HTML sanitizer to prevent XSS attacks.
 * Removes dangerous tags and attributes while preserving basic formatting.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';

  // Remove script tags and other dangerous elements
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
    .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '')
    .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove any remaining dangerous attributes
  sanitized = sanitized.replace(/<([^>]+)>/g, (tag) => {
    // Remove potentially dangerous attributes from opening tags
    return tag.replace(/\s+(on\w+|href|src|data|action|formaction|onclick|onload|onerror|onmouseover|onfocus|onblur)=["'][^"']*["']/gi, '');
  });

  return sanitized;
}