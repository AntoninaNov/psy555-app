// Minimal localStorage mock for the Node test environment.
// Zustand persist middleware reads/writes localStorage; this stub prevents crashes.

const store: Record<string, string> = {};

const localStorageMock = {
  getItem:    (key: string) => store[key] ?? null,
  setItem:    (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear:      () => { Object.keys(store).forEach((k) => delete store[k]); },
  key:        (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});
