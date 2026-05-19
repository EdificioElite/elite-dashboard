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
    expect(screen.getByText('Vecinales — Juntas Generales')).toBeInTheDocument();
    expect(screen.getByText('Vocales — Juntas de Junta Directiva')).toBeInTheDocument();
  });

  it('renders Ordinaria and Extraordinaria badges in vecinales', () => {
    render(
      <MemoryRouter>
        <JuntasGeneralesPage />
      </MemoryRouter>
    );
    const ordinarias = screen.getAllByText('Ordinaria');
    const extraordinarias = screen.getAllByText('Extraordinaria');
    expect(ordinarias.length).toBe(10);
    expect(extraordinarias.length).toBe(12);
  });

  it('renders correct dates', () => {
    render(
      <MemoryRouter>
        <JuntasGeneralesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('1 de septiembre de 2022')).toBeInTheDocument();
    expect(screen.getByText('12 de febrero de 2026')).toBeInTheDocument();
    expect(screen.getByText('25 de marzo de 2026')).toBeInTheDocument();
  });

  it('renders title and subtitle', () => {
    render(
      <MemoryRouter>
        <JuntasGeneralesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Juntas')).toBeInTheDocument();
    expect(screen.getByText('Edificio Elite — C.P. Pio Rio Hortega 46')).toBeInTheDocument();
  });
});
