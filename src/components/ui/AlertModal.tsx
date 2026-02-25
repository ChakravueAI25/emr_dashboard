import { useState, useEffect } from 'react';

// internal callback reference that will be set when the component mounts
import { flushSync } from 'react-dom';

let _show: ((message: string) => void) | null = null;

/**
 * Convenience helper that other components can import and call.
 * It simply forwards the message to the mounted AlertModal instance.
 */
export function showAlert(message: string) {
  if (_show) {
    // calling the registered handler directly; the handler is responsible
    // for flushing any state updates so the popup becomes visible without
    // waiting for React's usual batching.
    _show(message);
  } else {
    // fallback if invoked before the component mounts
    console.warn('showAlert called before AlertModal mounted:', message);
  }
}

export function AlertModal() {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // register global handler
    _show = (m: string) => {
      // flushSync forces React to apply state updates immediately rather
      // than waiting for the end of the event loop. this removes any
      // perceived delay between a button click and the alert appearing.
      flushSync(() => {
        setMsg(m);
        // determine current theme from root element (tailwind dark mode class)
        setTheme(
          document.documentElement.classList.contains('dark') ? 'dark' : 'light'
        );
        setVisible(true);
      });

      // hide after a short duration; this is intentionally left alone
      // since it affects disappearance rather than the show timing.
      setTimeout(() => setVisible(false), 2000);
    };

    return () => {
      _show = null;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className={`px-6 py-4 rounded-xl shadow-lg animate-popIn pointer-events-auto max-w-[80%] text-center break-words
          ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`}
        style={{ borderWidth: 1 }}
      >
        {msg}
      </div>
    </div>
  );
}
