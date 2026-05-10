import { useRef, useEffect, useState, useCallback } from 'react';

interface Option<T> {
  key: T;
  label: string;
}

interface SegmentedControlProps<T> {
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
}

export default function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ width: number; left: number }>({ width: 0, left: 0 });

  const updatePill = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const activeIdx = options.findIndex((o) => o.key === value);
    const buttons = track.querySelectorAll<HTMLElement>('.segmented-option');
    if (buttons.length === 0 || activeIdx < 0) return;

    let left = 0;
    for (let i = 0; i < activeIdx; i++) {
      left += buttons[i].offsetWidth;
    }
    setPillStyle({ width: buttons[activeIdx].offsetWidth, left });
  }, [value, options]);

  useEffect(() => {
    updatePill();
    const onResize = () => updatePill();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updatePill]);

  return (
    <div ref={trackRef} className="segmented-track" role="tablist">
      <div className="segmented-pill" style={{ width: pillStyle.width, transform: `translateX(${pillStyle.left}px)` }} />
      {options.map((opt) => (
        <button
          key={opt.key}
          role="tab"
          aria-selected={opt.key === value}
          className={`segmented-option${opt.key === value ? ' active' : ''}`}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
