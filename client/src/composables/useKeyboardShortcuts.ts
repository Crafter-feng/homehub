import { onMounted, onUnmounted } from 'vue';

/**
 * Keyboard shortcut composable
 * Detects bold letters in buttons (e.g., **P** Add) and triggers on keypress
 */
export function useKeyboardShortcuts() {
  const shortcuts = new Map<string, () => void>();

  function register(key: string, callback: () => void) {
    shortcuts.set(key.toLowerCase(), callback);
  }

  function unregister(key: string) {
    shortcuts.delete(key.toLowerCase());
  }

  function handleKeydown(event: KeyboardEvent) {
    // Skip if user is typing in an input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const key = event.key.toLowerCase();
    const callback = shortcuts.get(key);
    if (callback) {
      event.preventDefault();
      callback();
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });

  return { register, unregister };
}
