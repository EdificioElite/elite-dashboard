import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JuntasGeneralesPage from './JuntasGeneralesPage';

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { vecino_piso: '1A', email: 'vecino@test.com', is_admin: false },
  })),
}));

describe('JuntasGeneralesPage', () => {
  it('renders both tables', () => {
    render(
      <MemoryRouter>
        <JuntasGeneralesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Juntas de vecinos')).toBeInTheDocument();
    expect(screen.getByText('Juntas de vocales')).toBeInTheDocument();
  });

  it('renders Ordinaría and Extraordinaria badges', () => {
    render(
      <MemoryRouter>
        <JuntasGeneralesPage />
      </MemoryRouter>
    );
    const ordinarias = screen.getAllByText('Ordinaria');
    const extraordinarias = screen.getAllByText('Extraordinaria');
    expect(ordinarias.length).toBe(6);
    expect(extraordinarias.length).toBe(6);
  });

  it('renders correct dates', () => {
    render(
      <MemoryRouter>
        <JuntasGeneralesPage />
      </MemoryRouter>
    );
    const dates = screen.getAllByText('Viernes 15 de Marzo 2026 — 18:00');
    expect(dates.length).toBe(2);
    const dates2 = screen.getAllByText('Lunes 1 de Junio 2026 — 19:00');
    expect(dates2.length).toBe(2);
  });

  it('renders disabled download buttons', () => {
    render(
      <MemoryRouter>
        <JuntasGeneralesPage />
      </MemoryRouter>
    );
    const buttons = screen.getAllByText('Próximamente');
    expect(buttons.length).toBe(12);
  });
});
