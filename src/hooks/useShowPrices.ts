import { useEffect, useState } from 'react';
import { api } from '../services/api';

/**
 * Whether nightly prices should be shown on the public site.
 * Controlled from the admin dashboard ("Show prices on website").
 * Starts as `null` while loading so callers can avoid flashing prices.
 */
export const useShowPrices = (): boolean | null => {
  const [showPrices, setShowPrices] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getShowPrices().then((value) => {
      if (!cancelled) setShowPrices(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return showPrices;
};
