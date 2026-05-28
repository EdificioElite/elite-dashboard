import { useState, useRef, useEffect } from 'react';
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
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '3m', label: '3m' },
  { key: '1a', label: '1a' },
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleCustomClick = () => {
    if (!open) {
      setLocalDesde(desdeInput);
      setLocalHasta(hastaInput);
    }
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
    <div className="glass p-[14px] flex items-center gap-3">
      <span className="eyebrow shrink-0">PERIODO</span>
      <SegmentedControl
        options={PRESET_OPTIONS}
        value={preset ?? ('' as Preset)}
        onChange={handlePresetChange}
      />
      <div className="w-px h-5 bg-cocoa/6 shrink-0" />
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={handleCustomClick}
          className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md transition-colors hover:bg-cream/50 ${preset === null ? 'text-accent' : 'text-cocoa/60'}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{formatRangeLabel(desdeInput, hastaInput)}</span>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 glass rounded-md p-4 min-w-[280px] z-50" style={{ boxShadow: '0 4px 24px rgba(30,20,10,0.12), 0 1px 0 rgba(255,255,255,0.4) inset' }}>
            <div className="space-y-3">
              <label htmlFor="dr-desde" className="flex items-center gap-3">
                <span className="text-xs font-medium text-cocoa/60 w-12 shrink-0">Desde</span>
                <input
                  id="dr-desde"
                  type="datetime-local"
                  value={localDesde}
                  onChange={(e) => setLocalDesde(e.target.value)}
                  className="input-card flex-1 text-[13px]"
                />
              </label>
              <label htmlFor="dr-hasta" className="flex items-center gap-3">
                <span className="text-xs font-medium text-cocoa/60 w-12 shrink-0">Hasta</span>
                <input
                  id="dr-hasta"
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
          </div>
        )}
      </div>
    </div>
  );
}
