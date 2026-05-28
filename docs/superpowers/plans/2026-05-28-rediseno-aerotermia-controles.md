# Rediseno controles /aerotermia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear componente DateRangeControls reutilizable y aplicarlo en DashboardPage y AdminAerotermiaPage, moviendo ConsumoCard a primera posicion en /aerotermia.

**Architecture:** Nuevo componente `DateRangeControls` con SegmentedControl para presets y popover glass para rango personalizado. Se reutiliza en ambas paginas. La separacion de estado local del popover (inputs fecha) vs estado parent (desde/hasta reales) permite cancelar sin efectos laterales.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS, vitest + @testing-library/react

---

### Task 1: Crear DateRangeControls + tests

**Files:**
- Create: `src/components/DateRangeControls.tsx`
- Create: `src/components/DateRangeControls.test.tsx`

- [ ] **Step 1: Escribir el componente DateRangeControls**

```tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import SegmentedControl from './SegmentedControl';
import Icon from './Icon';
import { Preset, toDatetimeLocal, applyPreset } from '../lib/dates';

interface DateRangeControlsProps {
  preset: Preset | null;
  desdeInput: string;
  hastaInput: string;
  onPresetChange: (preset: Preset) => void;
  onCustomApply: (desde: string, hasta: string) => void;
}

function formatRangeLabel(desdeInput: string, hastaInput: string): string {
  if (!desdeInput || !hastaInput) return 'Personalizado';
  const d = new Date(desdeInput);
  const h = new Date(hastaInput);
  const fmt = (date: Date) =>
    date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const fmtYear = (date: Date) =>
    date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  if (d.getFullYear() === h.getFullYear()) {
    return `${fmt(d)} — ${fmtYear(h)}`;
  }
  return `${fmtYear(d)} — ${fmtYear(h)}`;
}

const PRESETS = [
  { key: '24h' as Preset, label: '24h' },
  { key: '7d' as Preset, label: '7 dias' },
  { key: '30d' as Preset, label: '30 dias' },
  { key: '3m' as Preset, label: '3 meses' },
  { key: '1a' as Preset, label: '1 año' },
];

export default function DateRangeControls({
  preset,
  desdeInput,
  hastaInput,
  onPresetChange,
  onCustomApply,
}: DateRangeControlsProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [localDesde, setLocalDesde] = useState(desdeInput);
  const [localHasta, setLocalHasta] = useState(hastaInput);
  const containerRef = useRef<HTMLDivElement>(null);

  const openPopover = useCallback(() => {
    setLocalDesde(desdeInput);
    setLocalHasta(hastaInput);
    setPopoverOpen(true);
  }, [desdeInput, hastaInput]);

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, []);

  const handleApply = useCallback(() => {
    onCustomApply(localDesde, localHasta);
    setPopoverOpen(false);
  }, [localDesde, localHasta, onCustomApply]);

  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closePopover();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverOpen, closePopover]);

  return (
    <div className="glass p-[14px] flex items-center gap-3 flex-wrap">
      <span className="eyebrow shrink-0">Periodo</span>

      <SegmentedControl<Preset>
        options={PRESETS}
        value={preset ?? ('' as Preset)}
        onChange={(k) => onPresetChange(k)}
      />

      <div className="w-px h-5 bg-cocoa/6 shrink-0" />

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={popoverOpen ? closePopover : openPopover}
          className={`flex items-center gap-2 text-xs font-medium py-1.5 px-3.5 rounded-[10px] border transition-colors ${
            popoverOpen || preset === null
              ? 'border-accent bg-accent/6 text-accent'
              : 'border-cocoa/6 bg-cream/50 text-cocoa/40 hover:text-cocoa/70'
          }`}
        >
          <Icon name="calendar" size={13} />
          {formatRangeLabel(desdeInput, hastaInput)}
        </button>

        {popoverOpen && (
          <div className="absolute right-0 top-full mt-2 z-20 glass p-[20px] flex items-end gap-4 shadow-lg"
            style={{
              background: 'rgba(255,251,245,0.97)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(30,20,10,0.12)',
            }}
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-cocoa/40 mb-2">Desde</label>
              <input
                type="date"
                value={localDesde.slice(0, 10)}
                onChange={(e) => setLocalDesde(e.target.value + 'T00:00')}
                className="input-card text-xs py-2 px-3 w-[150px]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-cocoa/40 mb-2">Hasta</label>
              <input
                type="date"
                value={localHasta.slice(0, 10)}
                onChange={(e) => setLocalHasta(e.target.value + 'T23:59')}
                className="input-card text-xs py-2 px-3 w-[150px]"
              />
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="btn btn-primary text-xs py-2 px-5 h-[38px]"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

Wait — I need to check if Icon has a "calendar" name. Let me check before writing the test.

- [ ] **Step 2: Verificar que Icon tiene el nombre 'calendar' disponible**

Run: `grep -r "calendar" src/components/Icon.tsx`
Expected: Find 'calendar' in the icon map, or need to use a different name.

Actually, I see in the header that Icon uses names like 'chevronUp', 'chevronDown', 'barChart', etc. Let me use a simple SVG inline instead of Icon to avoid depending on icon availability. Use the SVG from the mockup.

- [ ] **Step 3 (corregido): Escribir el componente final DateRangeControls**

```tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import SegmentedControl from './SegmentedControl';
import { Preset } from '../lib/dates';

interface DateRangeControlsProps {
  preset: Preset | null;
  desdeInput: string;
  hastaInput: string;
  onPresetChange: (preset: Preset) => void;
  onCustomApply: (desde: string, hasta: string) => void;
}

function formatRangeLabel(desdeInput: string, hastaInput: string): string {
  if (!desdeInput || !hastaInput) return 'Personalizado';
  const d = new Date(desdeInput);
  const h = new Date(hastaInput);
  const fmt = (date: Date) =>
    date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const fmtYear = (date: Date) =>
    date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  if (d.getFullYear() === h.getFullYear()) {
    return `${fmt(d)} — ${fmtYear(h)}`;
  }
  return `${fmtYear(d)} — ${fmtYear(h)}`;
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '3m', label: '3 meses' },
  { key: '1a', label: '1 año' },
];

export default function DateRangeControls({
  preset,
  desdeInput,
  hastaInput,
  onPresetChange,
  onCustomApply,
}: DateRangeControlsProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [localDesde, setLocalDesde] = useState(desdeInput);
  const [localHasta, setLocalHasta] = useState(hastaInput);
  const containerRef = useRef<HTMLDivElement>(null);

  const openPopover = useCallback(() => {
    setLocalDesde(desdeInput);
    setLocalHasta(hastaInput);
    setPopoverOpen(true);
  }, [desdeInput, hastaInput]);

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, []);

  const handleApply = useCallback(() => {
    onCustomApply(localDesde, localHasta);
    setPopoverOpen(false);
  }, [localDesde, localHasta, onCustomApply]);

  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closePopover();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverOpen, closePopover]);

  const isCustom = preset === null;

  return (
    <div className="glass p-[14px] flex items-center gap-3 flex-wrap">
      <span className="eyebrow shrink-0">Periodo</span>

      <SegmentedControl<Preset>
        options={PRESETS}
        value={preset ?? ('' as Preset)}
        onChange={(k) => onPresetChange(k)}
      />

      <div className="w-px h-5 bg-cocoa/6 shrink-0" />

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={popoverOpen ? closePopover : openPopover}
          className={`flex items-center gap-2 text-xs font-medium py-1.5 px-3.5 rounded-[10px] border transition-colors ${
            popoverOpen || isCustom
              ? 'border-accent bg-accent/6 text-accent'
              : 'border-cocoa/6 bg-cream/50 text-cocoa/40 hover:text-cocoa/70'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {formatRangeLabel(desdeInput, hastaInput)}
        </button>

        {popoverOpen && (
          <div
            className="absolute right-0 top-full mt-2 z-20 flex items-end gap-4"
            style={{
              background: 'rgba(255,251,245,.85)',
              backdropFilter: 'blur(16px) saturate(130%)',
              border: '1px solid rgba(30,20,10,.08)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 8px 32px rgba(30,20,10,.12)',
            }}
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-cocoa/40 mb-2">Desde</label>
              <input
                type="date"
                value={localDesde.slice(0, 10)}
                onChange={(e) => setLocalDesde(e.target.value + 'T00:00')}
                className="input-card text-xs py-2 px-3 w-[152px]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-cocoa/40 mb-2">Hasta</label>
              <input
                type="date"
                value={localHasta.slice(0, 10)}
                onChange={(e) => setLocalHasta(e.target.value + 'T23:59')}
                className="input-card text-xs py-2 px-3 w-[152px]"
              />
            </div>
            <button type="button" onClick={handleApply} className="btn btn-primary text-xs py-2 px-5 h-[38px]">
              Aplicar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Escribir los tests**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateRangeControls from './DateRangeControls';

function defaultProps(overrides = {}) {
  return {
    preset: '30d' as const,
    desdeInput: '2026-04-28T00:00',
    hastaInput: '2026-05-28T23:59',
    onPresetChange: vi.fn(),
    onCustomApply: vi.fn(),
    ...overrides,
  };
}

describe('DateRangeControls', () => {
  it('renders presets as segmented control buttons', () => {
    render(<DateRangeControls {...defaultProps()} />);
    expect(screen.getByRole('tab', { name: '24h' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '7 dias' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '30 dias' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '3 meses' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '1 año' })).toBeInTheDocument();
  });

  it('marks 30d as selected when preset is 30d', () => {
    render(<DateRangeControls {...defaultProps({ preset: '30d' })} />);
    expect(screen.getByRole('tab', { name: '30 dias' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows range label in custom button', () => {
    render(<DateRangeControls {...defaultProps()} />);
    expect(screen.getByText('28 abr — 28 may 2026')).toBeInTheDocument();
  });

  it('opens popover when custom button is clicked', async () => {
    render(<DateRangeControls {...defaultProps()} />);
    const btn = screen.getByText('28 abr — 28 may 2026');
    await userEvent.click(btn);
    expect(screen.getByText('Desde')).toBeInTheDocument();
    expect(screen.getByText('Hasta')).toBeInTheDocument();
    expect(screen.getByText('Aplicar')).toBeInTheDocument();
  });

  it('closes popover when Aplicar is clicked and calls onCustomApply', async () => {
    const onCustomApply = vi.fn();
    render(<DateRangeControls {...defaultProps({ onCustomApply })} />);
    await userEvent.click(screen.getByText('28 abr — 28 may 2026'));
    await userEvent.click(screen.getByText('Aplicar'));
    expect(onCustomApply).toHaveBeenCalledWith('2026-04-28T00:00', '2026-05-28T23:59');
    expect(screen.queryByText('Aplicar')).not.toBeInTheDocument();
  });

  it('calls onPresetChange when a preset is clicked', async () => {
    const onPresetChange = vi.fn();
    render(<DateRangeControls {...defaultProps({ onPresetChange })} />);
    await userEvent.click(screen.getByRole('tab', { name: '7 dias' }));
    expect(onPresetChange).toHaveBeenCalledWith('7d');
  });

  it('highlights custom button when preset is null', () => {
    render(<DateRangeControls {...defaultProps({ preset: null })} />);
    const btn = screen.getByText('28 abr — 28 may 2026').closest('button');
    expect(btn?.className).toContain('text-accent');
  });

  it('omits year from first date when both dates are in same year', () => {
    render(
      <DateRangeControls
        {...defaultProps({
          desdeInput: '2026-01-15T00:00',
          hastaInput: '2026-06-20T23:59',
        })}
      />
    );
    expect(screen.getByText('15 ene — 20 jun 2026')).toBeInTheDocument();
  });

  it('shows both years when dates span different years', () => {
    render(
      <DateRangeControls
        {...defaultProps({
          desdeInput: '2025-11-01T00:00',
          hastaInput: '2026-03-15T23:59',
        })}
      />
    );
    expect(screen.getByText('1 nov 2025 — 15 mar 2026')).toBeInTheDocument();
  });

  it('shows Personalizado when inputs are empty', () => {
    render(<DateRangeControls {...defaultProps({ desdeInput: '', hastaInput: '' })} />);
    expect(screen.getByText('Personalizado')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Ejecutar tests de DateRangeControls**

Run: `npx vitest run src/components/DateRangeControls.test.tsx`
Expected: All 9 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/DateRangeControls.tsx src/components/DateRangeControls.test.tsx
git commit -m "feat: componente DateRangeControls con presets y popover de rango"
```

---

### Task 2: Actualizar DashboardPage (/aerotermia)

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Reescribir DashboardPage con DateRangeControls y ConsumoCard primero**

```tsx
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../api/client';
import { greeting } from '../lib/format';

import ConsumoCard from '../components/ConsumoCard';
import HistoricoCharts from '../components/HistoricoCharts';
import FacturasChart from '../components/FacturasChart';
import FacturasTable from '../components/FacturasTable';
import DateRangeControls from '../components/DateRangeControls';
import Icon from '../components/Icon';
import { toDatetimeLocal, fromDatetimeLocal, applyPreset, Preset } from '../lib/dates';

interface Consumo {
  timestamp: string;
  m3_acs: number;
  kwh_calor_abs: number;
  kwh_frio_abs: number;
  m3_acs_abs: number;
  kwh_calor_mes_inicio: number | null;
  kwh_frio_mes_inicio: number | null;
  m3_acs_mes_inicio: number | null;
  temp_impulsion: number | null;
  temp_retorno: number | null;
  power_w: number | null;
}

interface Factura {
  id_factura: string;
  periodo: string;
  importe_total: number;
  importe_fijo: number;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_variable_acs: number;
  importe_acs: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [consumoActual, setConsumoActual] = useState<Consumo | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  const pisoParam = searchParams.get('piso');
  const viewingAs = user?.is_admin && pisoParam ? pisoParam : null;

  const [preset, setPreset] = useState<Preset | null>('30d');
  const [desdeInput, setDesdeInput] = useState(() => toDatetimeLocal(applyPreset('30d').desde));
  const [hastaInput, setHastaInput] = useState(() => toDatetimeLocal(applyPreset('30d').hasta));

  const { saludo } = greeting();
  const nombre = viewingAs ? `Piso ${viewingAs}` : (user?.vecino_piso || user?.email?.split('@')[0] || 'vecino');

  const handlePresetChange = (p: Preset) => {
    setPreset(p);
    const { desde, hasta } = applyPreset(p);
    setDesdeInput(toDatetimeLocal(desde));
    setHastaInput(toDatetimeLocal(hasta));
  };

  const handleCustomApply = (d: string, h: string) => {
    setDesdeInput(d);
    setHastaInput(h);
    setPreset(null);
  };

  const desde = desdeInput ? fromDatetimeLocal(desdeInput) : '';
  const hasta = hastaInput ? fromDatetimeLocal(hastaInput) : '';

  useEffect(() => {
    async function fetchData() {
      try {
        const pisoQs = viewingAs ? `?piso=${encodeURIComponent(viewingAs)}` : '';
        const [actual, facturasData] = await Promise.all([
          apiFetch<Consumo | null>(`/consumo-actual${pisoQs}`),
          apiFetch<Factura[]>(`/facturas${pisoQs}`),
        ]);
        setConsumoActual(actual);
        setFacturas(facturasData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [viewingAs]);

  const filteredFacturas = useMemo(() => {
    if (!desde || !hasta) return facturas;
    const desdeD = new Date(desde).getTime();
    const hastaD = new Date(hasta).getTime();
    return facturas.filter((f) => {
      const t = new Date(f.periodo).getTime();
      return t >= desdeD && t <= hastaD;
    });
  }, [facturas, desde, hasta]);

  if (loading) {
    return (
      <div>
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando tus datos...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div>
          <p className="eyebrow">{viewingAs ? 'Vista admin' : 'Servicios'}</p>
          {viewingAs && (
            <Link to="/admin/aerotermia" className="btn btn-ghost text-xs mb-2 inline-flex items-center gap-1">
              <Icon name="chevronLeft" size={14} />
              Volver a Aerotermia Admin
            </Link>
          )}
          <h1 className="font-display text-[38px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
            {saludo}, {nombre}.
          </h1>
        </div>

        <DateRangeControls
          preset={preset}
          desdeInput={desdeInput}
          hastaInput={hastaInput}
          onPresetChange={handlePresetChange}
          onCustomApply={handleCustomApply}
        />

        <div className="stagger flex flex-col gap-[22px]">
          <ConsumoCard data={consumoActual} />
          <HistoricoCharts
            endpoint={viewingAs ? `/admin/vecinos/${viewingAs}` : undefined}
            title={viewingAs ? `Historico — Piso ${viewingAs}` : undefined}
            desde={desde}
            hasta={hasta}
          />
          <div id="facturas" className="scroll-mt-20 relative z-10">
            <FacturasChart data={filteredFacturas} />
          </div>
          <FacturasTable data={filteredFacturas} />

          <div className="glass p-[26px]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-[#1abcfe]/10 flex items-center justify-center overflow-hidden">
                <img src="/images/home-assistant-icon.png" alt="Home Assistant" className="w-6 h-6" />
              </div>
              <div>
                <p className="eyebrow">Home Assistant</p>
                <h3 className="font-display text-[22px] font-medium text-cocoa">Integracion oficial para tu hogar</h3>
              </div>
            </div>

            <div>
              <p className="text-cocoa/70 text-sm leading-relaxed mb-4">
                Lleva los datos de tu aerotermia a Home Assistant para automatizar tu casa. La integracion{' '}
                <strong>Edificio Elite</strong> expone los consumos de calefaccion, refrigeracion, ACS, temperaturas
                y potencia en tiempo real como entidades en Home Assistant.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://github.com/EdificioElite/elite-home-assistant"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-cocoa/60 hover:text-cocoa transition-colors px-3 py-2 rounded-md hover:bg-accent/5"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Ver en GitHub
                </a>

                <a
                  href="https://my.home-assistant.io/redirect/hacs_repository/?owner=EdificioElite&repository=elite-home-assistant&category=integration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-white bg-[#1abcfe] hover:bg-[#18a8e4] transition-colors px-4 py-2.5 rounded-lg shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-2-14h4v2h-4V8zm0 4h4v6h-4v-6z"/>
                  </svg>
                  Añadir a Home Assistant
                </a>
              </div>

              <p className="text-cocoa/30 text-[11px] mt-4">
                Requiere Home Assistant 2024.1 o superior y HACS instalado.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Ejecutar el build del frontend**

Run: `npm run build`
Expected: Build exitoso sin errores de TypeScript

- [ ] **Step 3: Ejecutar tests del frontend**

Run: `npm test`
Expected: Todos los tests pasan

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: DateRangeControls y ConsumoCard primero en /aerotermia, default 30d"
```

---

### Task 3: Actualizar AdminAerotermiaPage (/admin/aerotermia)

**Files:**
- Modify: `src/pages/AdminAerotermiaPage.tsx`

- [ ] **Step 1: Reemplazar controles en AdminAerotermiaPage**

El cambio es solo en la seccion de controles (lineas 270-301). Reemplazar el bloque:

```tsx
<div className="flex flex-col sm:flex-row sm:items-center gap-3 glass p-[26px]">
  <span className="eyebrow shrink-0">Periodo</span>
  <div className="flex items-center gap-2">
    <button onClick={() => setRange('24h')} ...>24h</button>
    ...
  </div>
  <div className="flex items-center gap-2">
    <label ...>Desde:</label>
    <input type="datetime-local" ... />
  </div>
  <div className="flex items-center gap-2">
    <label ...>Hasta:</label>
    <input type="datetime-local" ... />
  </div>
</div>
```

Por:

```tsx
<DateRangeControls
  preset={preset}
  desdeInput={desdeInput}
  hastaInput={hastaInput}
  onPresetChange={(p) => { setPreset(p); const { desde, hasta } = applyPreset(p); setDesdeInput(toDatetimeLocal(desde)); setHastaInput(toDatetimeLocal(hasta)); }}
  onCustomApply={(d, h) => { setDesdeInput(d); setHastaInput(h); setPreset(null); }}
/>
```

Añadir el import: `import DateRangeControls from '../components/DateRangeControls';`

Eliminar la funcion `setRange` que ya no se usa (lineas 73-80) y el `useEffect` `useEffect(() => { setRange('3m'); }, []);` (linea 82). En su lugar, inicializar con '3m':

```tsx
const [preset, setPreset] = useState<Preset | null>('3m');
const [desdeInput, setDesdeInput] = useState(() => toDatetimeLocal(applyPreset('3m').desde));
const [hastaInput, setHastaInput] = useState(() => toDatetimeLocal(applyPreset('3m').hasta));
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: Build exitoso

- [ ] **Step 3: Ejecutar tests**

Run: `npm test`
Expected: Todos los tests pasan

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminAerotermiaPage.tsx
git commit -m "feat: DateRangeControls en /admin/aerotermia, mantiene default 3m"
```

---

### Task 4: Verificacion final y CI

- [ ] **Step 1: Ejecutar todos los tests**

Run: `npm test && npm run build`
Expected: Todo verde, build exitoso

- [ ] **Step 2: Subir rama y crear PR**

```bash
git push -u origin feat/rediseno-aerotermia-controles
gh pr create --title "feat: rediseno de controles de fecha y reorden en /aerotermia" --body "## Cambios

- Nuevo componente DateRangeControls con segmented pill + popover glass para rango personalizado
- DashboardPage: ConsumoCard movido a primera posicion, default 30d
- AdminAerotermiaPage: mismos controles, mantiene default 3m

Closes: none"
```
