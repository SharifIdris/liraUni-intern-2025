import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { sanitizeHtml } from '@/lib/security';

interface SecureInputProps extends React.ComponentProps<typeof Input> {
  sanitize?: boolean;
}

/**
 * Secure input component with built-in sanitization
 */
export const SecureInput = forwardRef<HTMLInputElement, SecureInputProps>(
  ({ onChange, sanitize = true, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (sanitize && onChange) {
        const sanitizedValue = sanitizeHtml(e.target.value);
        const sanitizedEvent = {
          ...e,
          target: { ...e.target, value: sanitizedValue }
        };
        onChange(sanitizedEvent);
      } else if (onChange) {
        onChange(e);
      }
    };

    return <Input ref={ref} onChange={handleChange} {...props} />;
  }
);

SecureInput.displayName = 'SecureInput';