import { useEffect } from 'react';

export default function useKeyboardShortcut({ onSave, onEscape, onEnter }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Create/Save Shortcut (Cmd+S or Ctrl+S)
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                if (onSave) {
                    e.preventDefault();
                    onSave();
                }
            }

            // Escape Shortcut
            if (e.key === 'Escape') {
                if (onEscape) {
                    e.preventDefault();
                    onEscape();
                }
            }

            // Enter Shortcut
            if (e.key === 'Enter' || e.key === 'Return' || e.keyCode === 13) {
                if (onEnter) {
                    e.preventDefault();
                    onEnter();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSave, onEscape, onEnter]);
}
