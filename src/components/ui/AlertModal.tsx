import { useState, useEffect } from 'react';

// internal callback reference that will be set when the component mounts
import { flushSync } from 'react-dom';

let _show: ((message: string) => void) | null = null;

/**
 * Convenience helper that other components can import and call.
 * It simply forwards the message to the mounted AlertModal instance.
 */
export function showAlert(message: string, type: 'success' | 'error' = 'success') {
  if (_show) {
    _show(message, type);
  } else {
    console.warn('showAlert called before AlertModal mounted:', message);
  }
}

export function AlertModal() {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [type, setType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    _show = (m: string, t: 'success' | 'error' = 'success') => {
      flushSync(() => {
        setMsg(m);
        setType(t);
        setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        setVisible(true);
      });
      setTimeout(() => setVisible(false), 2000);
    };
    return () => {
      _show = null;
    };
  }, []);

  if (!visible) return null;

  // Conditional text color for success/error, light/dark
  let textColor = '';
  if (type === 'success') {
    textColor = theme === 'dark' ? 'text-green-400' : 'text-green-600';
  } else if (type === 'error') {
    textColor = theme === 'dark' ? 'text-red-400' : 'text-red-600';
  }
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className={`px-6 py-4 rounded-xl shadow-lg animate-popIn pointer-events-auto max-w-[80%] text-center break-words ${textColor}
          ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
        style={{ borderWidth: 1 }}
      >
        {msg}
      </div>
    </div>
  );
}
