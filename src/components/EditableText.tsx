import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import API_ENDPOINTS from '../config/api';

export interface EditableTextHandle {
  startEditing: () => void;
}

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
  isEditable?: boolean;
  type?: 'text' | 'password';
  // optional explicit field name to send to evaluator (if not provided, will try to infer)
  evalField?: string;
  // disable evaluator for this field (useful for personal details)
  disableEval?: boolean;
}

export const EditableText = forwardRef<EditableTextHandle, EditableTextProps>(({
  value,
  onSave,
  className = '',
  placeholder = '--',
  isEditable = false,
  type = 'text',
  evalField,
  disableEval = false,
}, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState<string>(value != null ? String(value) : '');
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    startEditing: () => {
      if (isEditable) {
        setIsEditing(true);
      }
    }
  }));

  useEffect(() => {
    const valStr = value != null ? String(value) : '';
    setTempValue(valStr);
    // Evaluate the current value even when not editing
    if (!disableEval && valStr.trim().length > 0) {
      console.log(`[EVAL-INIT] Evaluating value on mount/change: "${valStr}"`);
      const handle = setTimeout(() => {
        evaluateReading(valStr).catch(() => { });
      }, 300);
      return () => clearTimeout(handle);
    } else {
      if (disableEval) console.log(`[EVAL-INIT] Eval disabled for this field`);
      setSeverity(null);
      setSeverityMessage('');
    }
  }, [value, disableEval]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    // Do not persist placeholder text into the model. If the user clears the
    // input, save an empty string. This avoids storing UI placeholders as data.
    const finalValue = tempValue.trim();
    if (finalValue !== (value != null ? String(value) : '')) onSave(finalValue);
    // evaluate the reading (fire-and-forget) unless disabled
    if (!disableEval) evaluateReading(finalValue).catch(() => { });
  };

  const [severity, setSeverity] = useState<'green' | 'yellow' | 'red' | null>(null);
  const [severityMessage, setSeverityMessage] = useState<string>('');

  const inferFieldName = (): string | undefined => {
    if (evalField) {
      console.log(`[INFER] evalField provided: "${evalField}"`);
      return evalField;
    }
    console.log(`[INFER] No evalField, trying DOM...`);
    const el = inputRef.current as HTMLElement | null;
    if (!el) {
      console.log(`[INFER] No inputRef.current`);
      return undefined;
    }
    // If inside a table cell, try previous sibling cell's text
    const td = el.closest('td');
    if (td) {
      const prev = td.previousElementSibling as HTMLElement | null;
      if (prev && prev.textContent && prev.textContent.trim()) {
        console.log(`[INFER] From prev cell: "${prev.textContent.trim()}"`);
        return prev.textContent.trim();
      }
      const tr = td.closest('tr');
      if (tr) {
        const firstTd = tr.querySelector('td');
        if (firstTd && firstTd !== td && firstTd.textContent && firstTd.textContent.trim()) {
          console.log(`[INFER] From first cell: "${firstTd.textContent.trim()}"`);
          return firstTd.textContent.trim();
        }
      }
    }
    // fallback to nearest label
    const label = el.closest('label');
    if (label && label.textContent) {
      console.log(`[INFER] From label: "${label.textContent.trim()}"`);
      return label.textContent.trim();
    }
    // fallback: use placeholder if present and not default
    if (placeholder && placeholder !== '--') {
      console.log(`[INFER] Falling back to placeholder: "${placeholder}"`);
      return String(placeholder).trim();
    }

    // last resort: try to find any nearby descriptive text in ancestors
    let ancestor: HTMLElement | null = el.parentElement;
    for (let i = 0; i < 4 && ancestor; i++) {
      // prefer previous sibling textual nodes
      const prev = ancestor.previousElementSibling as HTMLElement | null;
      if (prev && prev.textContent && prev.textContent.trim()) {
        const t = prev.textContent.trim();
        console.log(`[INFER] From ancestor prev: "${t}"`);
        return t;
      }
      // try to find a small label-like element inside ancestor
      const candidate = ancestor.querySelector('p,span,div,label');
      if (candidate && candidate.textContent && candidate.textContent.trim()) {
        const t = candidate.textContent.trim();
        console.log(`[INFER] From ancestor candidate: "${t}"`);
        return t;
      }
      ancestor = ancestor.parentElement;
    }

    console.log(`[INFER] Could not infer field name, returning undefined`);
    return undefined;
  };

  const evaluateReading = async (val: string) => {
    try {
      const inferred = inferFieldName();
      const fieldName = inferred || (placeholder && placeholder !== '--' ? String(placeholder).trim() : 'unknown');
      console.log(`[EVAL] Field: "${fieldName}", Value: "${val}" (inferred: ${String(inferred)})`);
      if (!val || val.length === 0) {
        setSeverity(null); setSeverityMessage(''); return;
      }
      const resp = await fetch(API_ENDPOINTS.EVALUATE_READING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: fieldName, value: val })
      });
      if (!resp.ok) {
        console.log(`[EVAL] API Error: ${resp.status}`);
        return;
      }
      const json = await resp.json();
      // Handle null severity from backend (for non-numeric fields)
      const sev = json.severity as 'green' | 'yellow' | 'red' | null;
      console.log(`[EVAL] Response: severity=${sev}, message="${json.message}"`);
      setSeverity(sev);
      setSeverityMessage(json.message || '');
    } catch (err) {
      console.log(`[EVAL] Error: ${err}`);
      // ignore evaluator errors
    }
  };

  // Live evaluation on change with debounce (during editing)
  useEffect(() => {
    if (disableEval || !isEditing) return;
    // don't evaluate empty values
    if (!tempValue || tempValue.trim().length === 0) {
      setSeverity(null); setSeverityMessage(''); return;
    }
    console.log(`[EVAL-LIVE] Debounce triggered for: "${tempValue}"`);
    const handle = setTimeout(() => {
      evaluateReading(tempValue).catch(() => { });
    }, 600);
    return () => clearTimeout(handle);
  }, [tempValue, isEditing, evalField, disableEval]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTempValue(value != null ? String(value) : '');
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Save the current value first
      const finalValue = tempValue.trim();
      const strValue = value != null ? String(value) : '';
      if (finalValue !== strValue) onSave(finalValue);
      setIsEditing(false);

      // Find all editable elements and move to next/previous
      const allEditables = Array.from(document.querySelectorAll('[data-editable="true"]'));
      const currentElement = inputRef.current?.closest('[data-editable="true"]');
      const currentIndex = allEditables.indexOf(currentElement as Element);

      if (currentIndex !== -1) {
        const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
        if (nextIndex >= 0 && nextIndex < allEditables.length) {
          const nextElement = allEditables[nextIndex] as HTMLElement;
          // Use setTimeout to ensure current field closes before opening next
          setTimeout(() => {
            nextElement.click();
          }, 0);
        }
      }
    }
  };

  const alignLeft = className.includes('text-left') || className.includes('justify-start');
  const alignRight = className.includes('text-right') || className.includes('justify-end');

  if (!isEditable) {
    const justifyClass = alignLeft ? 'justify-start text-left' : alignRight ? 'justify-end text-right' : 'justify-center text-center';
    return (
      <div
        className={`inline-flex items-center ${justifyClass} w-full ${className}`}
        title={severityMessage || (value || placeholder)}
      >
        {/* severity dot visible when not editing too */}
        {severity && (
          <span className={`w-2.5 h-2.5 rounded-full mr-1 flex-shrink-0 ${severity === 'red' ? 'bg-red-500' : severity === 'yellow' ? 'bg-yellow-400' : 'bg-green-500'}`} />
        )}
        {type === 'password' ? (value ? '•'.repeat(Math.max(3, value.length)) : placeholder) : (value || placeholder)}
      </div>
    );
  }

  return (
    <div
      data-editable="true"
      className={`inline-flex items-center ${alignLeft ? 'justify-start text-left' : alignRight ? 'justify-end text-right' : 'justify-center text-center'} h-[28px] w-full text-xs ${className} ${isEditable && !isEditing ? 'border border-[#D4A574] hover:border-[#D4A574]/50 rounded px-2 transition-colors' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title={severityMessage}
    >
      <div className="flex items-center gap-1 w-full">
        {/* severity dot always visible */}
        {severity && (
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${severity === 'red' ? 'bg-red-500' : severity === 'yellow' ? 'bg-yellow-400' : 'bg-green-500'}`} />
        )}
        {isEditing ? (
          <input
            ref={inputRef}
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={`bg-transparent border-b border-[#D4A574] text-white text-xs ${alignLeft ? 'text-left' : alignRight ? 'text-right' : 'text-center'} focus:outline-none h-[24px] leading-[24px] flex-1 caret-[#D4A574] animate-pulse`}
          />
        ) : (
          <span className={`cursor-pointer hover:text-[#D4A574] truncate flex-1 h-[24px] leading-[24px] ${alignLeft ? 'text-left' : alignRight ? 'text-right' : 'text-center'}`}>
            {value || placeholder}
          </span>
        )}
      </div>
    </div>
  );
});
EditableText.displayName = 'EditableText';
