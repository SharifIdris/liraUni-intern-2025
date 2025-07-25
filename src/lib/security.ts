import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
};

/**
 * Validates file upload security
 */
export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only images are allowed.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 5MB.' };
  }

  return { valid: true };
};

/**
 * Safely clones DOM content for printing without XSS risk
 */
export const safePrintElement = (elementId: string): void => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Print element not found');
    return;
  }

  // Create a new window for printing instead of manipulating innerHTML
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  // Copy styles and sanitized content
  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print</title>
        <style>${styles}</style>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
          }
        </style>
      </head>
      <body>
        ${sanitizeHtml(element.innerHTML)}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

/**
 * Sanitizes error messages to prevent information disclosure
 */
export const sanitizeErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    // Remove potential sensitive information
    return error.replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, '[email]')
                .replace(/\b\d{4,}\b/g, '[number]')
                .replace(/password/gi, '[credential]');
  }
  
  if (error?.message) {
    return sanitizeErrorMessage(error.message);
  }

  return 'An error occurred. Please try again.';
};