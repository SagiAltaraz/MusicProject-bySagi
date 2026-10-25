import { useEffect } from 'react';
import usePlayerStore from '../stores/playerStore';
import useUiStore from '../stores/uiStore';

export const SHORTCUTS = [
  ['Space', 'Play / pause'],
  ['← / →', 'Seek 10 seconds'],
  ['Shift + ← / →', 'Previous / next track'],
  ['↑ / ↓', 'Volume'],
  ['M', 'Mute'],
  ['Q', 'Toggle queue'],
  ['D', 'Toggle downloads'],
  ['/ or ⌘K', 'Search'],
  ['Esc', 'Close panel'],
];

/** Global player shortcuts - ignored while typing in a field. */
export default function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (useUiStore.getState().closeTop()) e.preventDefault();
        return;
      }
      const el = document.activeElement;
      const typing = el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      // Let buttons/links handle their own Space/Enter
      if (e.key === ' ' && ['BUTTON', 'A'].includes(el?.tagName)) return;

      const p = usePlayerStore.getState();
      const ui = useUiStore.getState();
      const actions = {
        ' ': () => p.togglePlay(),
        ArrowLeft: () => (e.shiftKey ? p.playPrevious() : p.seekBy(-10)),
        ArrowRight: () => (e.shiftKey ? p.playNext() : p.seekBy(10)),
        ArrowUp: () => p.setVolume(Math.min(100, p.volume + 5)),
        ArrowDown: () => p.setVolume(Math.max(0, p.volume - 5)),
        m: () => p.toggleMute(),
        q: () => ui.toggleQueue(),
        d: () => ui.toggleDownloads(),
      };
      const fn = actions[e.key] || actions[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
