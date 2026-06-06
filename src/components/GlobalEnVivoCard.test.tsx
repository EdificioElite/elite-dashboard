import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GlobalEnVivoCard from './GlobalEnVivoCard';

const mockApiFetch = vi.fn();
vi.mock('../api/client', () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

describe('GlobalEnVivoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra "Esperando datos" cuando no hay datos', async () => {
    mockApiFetch.mockResolvedValue(null);
    render(<GlobalEnVivoCard />);
    await waitFor(() => {
      expect(screen.getByText(/Esperando datos/)).toBeInTheDocument();
    });
  });

  it('muestra los 5 bloques cuando hay datos', async () => {
    mockApiFetch.mockResolvedValue({
      timestamp: '2026-06-06T14:05:22Z',
      kwh_calor_abs: 12450.6,
      kwh_frio_abs: 6180.2,
      m3_acs_abs: 245.6,
      kwh_calor_mes_inicio: 342.1,
      kwh_frio_mes_inicio: 89.3,
      m3_acs_mes_inicio: 12.3,
      temp_impulsion_avg: 42.0,
      temp_impulsion_max: 48.2,
      temp_impulsion_min: 35.1,
      temp_retorno_avg: 33.5,
      temp_retorno_max: 38.6,
      temp_retorno_min: 28.3,
      modo: 'calefaccion',
    });
    render(<GlobalEnVivoCard />);
    await waitFor(() => {
      expect(screen.getByText('Aerotermia Global en Vivo')).toBeInTheDocument();
    });
    expect(screen.getByText(/12\.?450,6/)).toBeInTheDocument();
    expect(screen.getByText(/6\.?180,2/)).toBeInTheDocument();
    expect(screen.getByText('245,6')).toBeInTheDocument();
    expect(screen.getAllByText('Calefacción').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/48\.2° máx/)).toBeInTheDocument();
  });

  it('muestra modo refrigeracion', async () => {
    mockApiFetch.mockResolvedValue({
      timestamp: '2026-06-06T14:05:22Z',
      kwh_calor_abs: 100, kwh_frio_abs: 100, m3_acs_abs: 10,
      kwh_calor_mes_inicio: 0, kwh_frio_mes_inicio: 0, m3_acs_mes_inicio: 0,
      temp_impulsion_avg: 15.0, temp_impulsion_max: 18, temp_impulsion_min: 12,
      temp_retorno_avg: 10, temp_retorno_max: 12, temp_retorno_min: 8,
      modo: 'refrigeracion',
    });
    render(<GlobalEnVivoCard />);
    await waitFor(() => {
      const refris = screen.getAllByText('Refrigeración');
      expect(refris.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('hace polling cada 30s', async () => {
    let capturedCallback: (() => void) | null = null;
    const origSetInterval = global.setInterval.bind(global);

    const setIntervalSpy = vi.spyOn(global, 'setInterval').mockImplementation(
      (fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) => {
        if (ms === 30000) {
          capturedCallback = fn as () => void;
          return 1 as unknown as ReturnType<typeof setInterval>;
        }
        return origSetInterval(fn as TimerHandler, ms, ...args);
      }
    );
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    mockApiFetch.mockResolvedValue(null);
    const { unmount } = render(<GlobalEnVivoCard />);

    // Initial fetch called on mount
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

    // Manually trigger the interval callback
    capturedCallback!();
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });

    // Trigger again
    capturedCallback!();
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(3);
    });

    // Cleanup should clear interval
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
