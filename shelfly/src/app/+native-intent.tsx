// The share extension opens the app with shelfly://dataUrl=…; that isn't a screen, so land on Home
// and let the share handler in _layout.tsx pick it up.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return path.includes('dataUrl=') ? '/' : path;
}
