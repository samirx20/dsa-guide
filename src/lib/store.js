import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/** localStorage-backed state shared across components (same key => same value). */
const listeners = new Map();
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
const snapshots = new Map();

export function usePersistent(key, fallback) {
  const subscribe = useCallback(
    (cb) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(cb);
      return () => listeners.get(key).delete(cb);
    },
    [key]
  );
  const get = useCallback(() => {
    if (!snapshots.has(key)) snapshots.set(key, read(key, fallback));
    return snapshots.get(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const value = useSyncExternalStore(subscribe, get);
  const set = useCallback(
    (next) => {
      const cur = snapshots.has(key) ? snapshots.get(key) : read(key, fallback);
      const v = typeof next === "function" ? next(cur) : next;
      snapshots.set(key, v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* storage unavailable */
      }
      listeners.get(key)?.forEach((cb) => cb());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  return [value, set];
}

/** Hash-based routing: "#/dsa/part2/topic1/chapter3-kadanes-algorithm#section-id" */
export function useHashRoute() {
  const parse = () => {
    const h = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
    const [path, anchor] = h.split("#");
    return { path: path || "", anchor: anchor || "" };
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const href = (path, anchor) => `#/${path}${anchor ? "#" + anchor : ""}`;
