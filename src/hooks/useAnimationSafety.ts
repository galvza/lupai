'use client';

import { useState, useEffect } from 'react';

/**
 * Returns true after `timeout` ms OR if prefers-reduced-motion is set.
 * Use as a fallback to force content visible if whileInView never fires.
 */
export function useAnimationSafety(timeout = 2000): boolean {
  const [forceVisible, setForceVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setForceVisible(true);
      return;
    }
    const timer = setTimeout(() => setForceVisible(true), timeout);
    return () => clearTimeout(timer);
  }, [timeout]);

  return forceVisible;
}
