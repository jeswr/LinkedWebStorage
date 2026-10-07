const portNames = [
  'LinkedWebStorage',
  'LinkedWebStorageInbox',
] as const;

/**
 * Returns a unique port for the given name, so integration tests can run in parallel.
 */
export function getPort(name: typeof portNames[number]): number {
  // 6000 is a bad port, causing node v18+ to block fetch requests targeting such a URL
  // https://fetch.spec.whatwg.org/#port-blocking
  return 6100 + portNames.indexOf(name) + 1;
}

export async function flushPromises(): Promise<void> {
  return new Promise(jest.requireActual('timers').setImmediate);
}

export function compareMaps<TKey, TVal>(map1: Map<TKey, TVal>, map2: Map<TKey, TVal>): void {
  expect(new Set(map1.keys())).toEqual(new Set(map2.keys()));
  // Looping like this also allows us to compare SetMultiMaps
  for (const key of map1.keys()) {
    // Adding key for better error output
    expect({ key, value: map1.get(key) }).toEqual({ key, value: map2.get(key) });
  }
}
