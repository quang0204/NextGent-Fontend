import React, { useRef, useEffect, useState } from 'react';

export type OtpInputStatus = 'idle' | 'busy' | 'error' | 'success';

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  status?: OtpInputStatus;
  shakeKey?: number;
  statusText?: string;
  onComplete?: (otp: string) => void;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  status = 'idle',
  shakeKey = 0,
  statusText,
  onComplete,
}) => {
  const toSlots = (str: string) =>
    Array.from({ length }, (_, i) => (str[i] && /\d/.test(str[i]) ? str[i] : ''));

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [slots, setSlots] = useState<string[]>(() => toSlots(value));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [popCounts, setPopCounts] = useState<number[]>(() => Array(length).fill(0));
  const prevEmittedRef = useRef<string>(value);
  const prevDigitsRef = useRef<string[]>(slots);

  // Chỉ đồng bộ lại slots từ props khi parent thay đổi value bên ngoài (vd: Gửi lại mã OTP)
  useEffect(() => {
    if (value !== prevEmittedRef.current) {
      prevEmittedRef.current = value;
      setSlots(toSlots(value));
    }
  }, [value, length]);

  const digits = slots;

  useEffect(() => {
    const prev = prevDigitsRef.current;
    const changed: number[] = [];
    for (let i = 0; i < length; i++) {
      if (digits[i] && digits[i] !== prev[i]) {
        changed.push(i);
      }
    }
    prevDigitsRef.current = digits;
    if (changed.length > 0) {
      setPopCounts((counts) => {
        const next = [...counts];
        while (next.length < length) next.push(0);
        for (const idx of changed) next[idx] = (next[idx] || 0) + 1;
        return next;
      });
    }
  }, [digits, length]);

  useEffect(() => {
    if (autoFocus && !disabled && status === 'idle' && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const isLocked = disabled || status === 'busy' || status === 'success';
  const centerIdx = (length - 1) / 2;

  const commitSlots = (nextDigits: string[]) => {
    const compact = nextDigits.join('');
    prevEmittedRef.current = compact;
    setSlots(nextDigits);
    onChange(compact);
  };

  const focusBox = (idx: number) => {
    if (idx < 0 || idx >= length) {
      setFocusedIndex(null);
      return;
    }
    setFocusedIndex(idx);
    inputsRef.current[idx]?.focus({ preventScroll: true });
  };

  const fillFromIndex = (startIdx: number, rawText: string) => {
    if (isLocked) return;
    const cleaned = rawText.replace(/\D/g, '').split('');
    if (cleaned.length === 0) return;

    const targetStart = cleaned.length >= length ? 0 : startIdx;
    const nextDigits = [...digits];
    cleaned.forEach((digit, offset) => {
      if (targetStart + offset < length) {
        nextDigits[targetStart + offset] = digit;
      }
    });

    commitSlots(nextDigits);

    const firstEmpty = nextDigits.findIndex((d) => !d);
    if (firstEmpty === -1) {
      setFocusedIndex(null);
      inputsRef.current[length - 1]?.blur();
      if (onComplete) {
        onComplete(nextDigits.join(''));
      }
    } else {
      const nextFocus = Math.max(firstEmpty, Math.min(length - 1, targetStart + cleaned.length));
      focusBox(nextFocus);
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const rawDigits = e.target.value.replace(/\D/g, '');
    const oldVal = digits[index];

    if (!rawDigits) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      commitSlots(nextDigits);
      return;
    }

    let added = rawDigits;
    if (oldVal && rawDigits.length > 1) {
      added = rawDigits.startsWith(oldVal)
        ? rawDigits.slice(oldVal.length)
        : rawDigits.slice(0, rawDigits.length - oldVal.length) || rawDigits;
    }
    fillFromIndex(index, added);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isLocked) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        const nextDigits = [...digits];
        nextDigits[index] = '';
        commitSlots(nextDigits);
        focusBox(index);
      } else if (index > 0) {
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        commitSlots(nextDigits);
        focusBox(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;
    e.preventDefault();
    fillFromIndex(index, pasted);
  };

  const rowClasses = [
    'u406-row',
    status === 'busy' ? 'is-busy' : '',
    status === 'error' ? `is-err ${shakeKey % 2 === 1 ? 'is-shake-a' : 'is-shake-b'}` : '',
    status === 'success' ? 'is-merge' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const liveAnnouncement =
    statusText ||
    (status === 'busy'
      ? 'Đang xác thực mã OTP'
      : status === 'success'
      ? 'Xác thực OTP thành công'
      : status === 'error'
      ? 'Mã OTP không chính xác'
      : '');

  return (
    <div className="u406">
      <div className="u406-wrap">
        <div
          className={rowClasses}
          style={{ '--u406-len': length } as React.CSSProperties}
          role="group"
          aria-label={`Mã xác thực ${length} chữ số`}
        >
          {Array.from({ length }).map((_, index) => {
            const boxStyle = {
              '--i': index,
              '--mx': `${(centerIdx - index) * 50}px`,
              '--d': Math.abs(centerIdx - index) * 2,
            } as React.CSSProperties;

            const boxClasses = [
              'u406-b',
              digits[index] ? 'is-fill' : '',
              focusedIndex === index && !isLocked ? 'is-cur' : '',
              disabled && status === 'idle' ? 'is-disabled' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div key={index} className={boxClasses} style={boxStyle}>
                <input
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  aria-label={`Chữ số ${index + 1}`}
                  aria-invalid={status === 'error' ? 'true' : undefined}
                  value={digits[index]}
                  disabled={isLocked}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex((prev) => (prev === index ? null : prev))}
                  onPointerDown={() => {
                    if (!isLocked) setFocusedIndex(index);
                  }}
                  onChange={(e) => handleChange(index, e)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={(e) => handlePaste(index, e)}
                  className="u406-in"
                />
                <span
                  key={`${index}-${popCounts[index] || 0}`}
                  className={`u406-g${popCounts[index] > 0 ? ' is-pop' : ''}`}
                  aria-hidden="true"
                >
                  {digits[index]}
                </span>
              </div>
            );
          })}
        </div>

        <svg className="u406-ck" viewBox="0 0 60 60" aria-hidden="true">
          <circle cx="30" cy="30" r="30" />
          <path d="M18 30.5l8 8L42.5 22" />
        </svg>
      </div>
      <p className="u406-live" role="status">
        {liveAnnouncement}
      </p>
    </div>
  );
};
