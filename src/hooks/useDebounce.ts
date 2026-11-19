import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce any value (e.g. search inputs, filters).
 * Delays updating the debounced value until after the specified delay has passed
 * since the last time the value was updated.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
