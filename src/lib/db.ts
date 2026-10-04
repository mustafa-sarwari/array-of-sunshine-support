import { useSyncExternalStore } from 'react';
import { buildSeed } from './seed';
import type { DemoDatabase } from './types';

/**
 * Local demo persistence. Stands in for DynamoDB: the whole dataset lives in
 * localStorage so the widget tab and dashboard tab stay in sync. Components
 * must go through ownerApi / publicApi rather than reading this directly.
 */

const STORAGE_KEY = 'aos-support-demo:db:v1';
const listeners = new Set<() => void>();
let cache: DemoDatabase | null = null;

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function load(): DemoDatabase {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoDatabase;
      if (parsed?.version === 1) return parsed;
    } catch {
      // Corrupt data falls through to a fresh seed.
    }
  }
  const seeded = buildSeed();
  storage()?.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function emit() {
  for (const l of listeners) l();
}

export function getDb(): DemoDatabase {
  cache ??= load();
  return cache;
}

export function updateDb(mutator: (draft: DemoDatabase) => void): DemoDatabase {
  const previous = getDb();
  const draft = structuredClone(previous);
  mutator(draft);
  cache = draft;
  storage()?.setItem(STORAGE_KEY, JSON.stringify(draft));
  try { emit(); } catch (error) { cache = previous; throw error; }
  return draft;
}

export function resetDemoData(): void {
  cache = buildSeed();
  storage()?.setItem(STORAGE_KEY, JSON.stringify(cache));
  emit();
}

/** Test helper: replace the in-memory dataset without touching localStorage. */
export function __setDbForTests(db: DemoDatabase): void {
  cache = db;
}

export function subscribeDb(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      emit();
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** Re-render when demo data changes in this tab or another tab. */
export function useDb(): DemoDatabase {
  return useSyncExternalStore(subscribeDb, getDb, getDb);
}
