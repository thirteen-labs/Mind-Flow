import { useSyncExternalStore } from 'react';

let isOpen = false;
let activeNoteId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openSidebar() {
  isOpen = true;
  emit();
}

export function closeSidebar() {
  isOpen = false;
  emit();
}

export function toggleSidebar() {
  isOpen = !isOpen;
  emit();
}

export function setActiveNoteId(id: string | null) {
  activeNoteId = id;
  emit();
}

export function getActiveNoteId(): string | null {
  return activeNoteId;
}

export function useSidebar() {
  const open = useSyncExternalStore(subscribe, () => isOpen);
  return { isOpen: open, open: openSidebar, close: closeSidebar, toggle: toggleSidebar };
}

export function useActiveNoteId(): string | null {
  return useSyncExternalStore(subscribe, () => activeNoteId);
}
