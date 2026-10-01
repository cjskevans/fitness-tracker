import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import toast from 'react-hot-toast';
import { getStatus, subscribe } from '../connection';

// A fixed id makes react-hot-toast replace the toast instead of stacking one per
// failed request, so a page that fires six requests during an outage shows one.
const TOAST_ID = 'connection';

export default function ConnectionStatus() {
  const reachable = useSyncExternalStore(subscribe, getStatus);
  const previous = useRef(reachable);

  useEffect(() => {
    if (reachable === previous.current) return; // no "Back online" on first mount
    previous.current = reachable;

    if (reachable) {
      toast.success('Back online', { id: TOAST_ID, duration: 3000 });
    } else {
      toast.error("Can't reach the server. Retrying…", { id: TOAST_ID, duration: Infinity });
    }
  }, [reachable]);

  return null;
}
