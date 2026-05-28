import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Preset } from '../lib/dates';
import SegmentedControl from './SegmentedControl';

interface DateRangeControlsProps {
  preset: Preset | null;
  desdeInput: string;
  hastaInput: string;
  onPresetChange: (preset: Preset) => void;
  onCustomApply: (desde: string, hasta: string) => void;
}

const PRESET_OPTIONS: { key: Preset; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '3m', label: '3 meses' },
  { key: '1a', label: '1 año' },
];

function formatRangeLabel(desdeInput: string, hastaInput: string): string {
  if (!desdeInput || !hastaInput) return 'Personalizado';
  const d = new Date(desdeInput);
  const h = new Date(hastaInput);
  const fmt = (date: Date) =>
    date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const fmtYear = (date: Date) =>
    date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  if (d.getFullYear() === h.getFullYear()) {
    return `${fmt(d)} \u2014 ${fmtYear(h)}`;
  }
  return `${fmtYear(d)} \u2014 ${fmtYear(h)}`;
}

export default function DateRangeControls({
  preset,
  desdeInput,
  hastaInput,
  onPresetChange,
  onCustomApply,
}: DateRangeControlsProps) {
  const [open, setOpen] = useState(false);
  const [localDesde, setLocalDesde] = useState('');
  const [localHasta, setLocalHasta] = useState('');
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const desdeId = useId();
  const hastaId = useId();

  const updatePopoverPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPopoverStyle({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (open) updatePopoverPosition();
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => updatePopoverPosition();
    const handleResize = () => updatePopoverPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleCustomClick = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setLocalDesde(desdeInput);
    setLocalHasta(hastaInput);
    setOpen(true);
  };

  const handleApply = () => {
    onCustomApply(localDesde, localHasta);
    setOpen(false);
  };

  const handlePresetChange = (key: Preset) => {
    setOpen(false);
    onPresetChange(key);
  };

  return (
    <div className="glass p-[14px] flex items-center gap-3 flex-wrap">
      <span className="eyebrow shrink-0">Periodo</span>
      <SegmentedControl
        options={PRESET_OPTIONS}
        value={preset}
        onChange={handlePresetChange}
      />
      <div className="w-px h-5 bg-cocoa/6 shrink-0" />
      <div ref={containerRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleCustomClick}
          className={`flex items-center gap-2 text-xs font-medium py-1.5 px-3.5 rounded-[10px] border transition-colors ${open || preset === null ? 'border-accent bg-accent/6 text-accent' : 'border-cocoa/6 bg-cream/50 text-cocoa/40 hover:text-cocoa/70'}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{formatRangeLabel(desdeInput, hastaInput)}</span>
        </button>
        {open && createPortal(
          <div ref={popoverRef} className="glass rounded-md p-4 min-w-[280px]" style={{ position: 'fixed', top: popoverStyle.top, right: popoverStyle.right, boxShadow: '0 4px 24px rgba(30,20,10,0.12), 0 1px 0 rgba(255,255,255,0.4) inset', zIndex: 9999 }}>
            <div className="space-y-3">
              <label htmlFor={desdeId} className="flex items-center gap-3">
                <span className="text-xs font-medium text-cocoa/60 w-12 shrink-0">Desde</span>
                <input
                  id={desdeId}
                  type="datetime-local"
                  value={localDesde}
                  onChange={(e) => setLocalDesde(e.target.value)}
                  className="input-card flex-1 text-[13px]"
                />
              </label>
              <label htmlFor={hastaId} className="flex items-center gap-3">
                <span className="text-xs font-medium text-cocoa/60 w-12 shrink-0">Hasta</span>
                <input
                  id={hastaId}
                  type="datetime-local"
                  value={localHasta}
                  onChange={(e) => setLocalHasta(e.target.value)}
                  className="input-card flex-1 text-[13px]"
                />
              </label>
              <div className="flex justify-end">
                <button type="button" onClick={handleApply} className="btn btn-primary text-xs">
                  Aplicar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
