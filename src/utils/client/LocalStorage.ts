const keyListeners: Record<string, ((value: string) => void)[]> = {};

const LocalStorage = {
  setItem: (key: string, value: string) => {
    const listeners = keyListeners[key];
    localStorage.setItem(key, value);
    listeners?.forEach((listener) => listener(value));
  },
  getItem: (key: string) => {
    return localStorage.getItem(key);
  },
  addKeyChangeListener: (key: string, callback: (value: string) => void) => {
    keyListeners[key] ??= [];
    keyListeners[key].push(callback);
  },
  removeEventListener: (key: string, callback: (value: string) => void) => {
    keyListeners[key] = keyListeners[key]?.filter((listener) => listener !== callback);
  },
};

export default LocalStorage;
