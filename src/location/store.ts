import { useSyncExternalStore } from 'react';

import { readPreference, writePreference } from '@/storage/preferences';

import { Place } from './place';

const PREFERENCE_KEY = 'place';

let current: Place | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function snapshot(): Place | null {
  if (!loaded) {
    current = readPreference(PREFERENCE_KEY, Place);
    loaded = true;
  }
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPlace(place: Place): void {
  writePreference(PREFERENCE_KEY, place);
  current = place;
  loaded = true;
  listeners.forEach((listener) => listener());
}

export function usePlace(): Place | null {
  return useSyncExternalStore(subscribe, snapshot);
}
