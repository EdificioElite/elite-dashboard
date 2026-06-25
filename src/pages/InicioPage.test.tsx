import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InicioPage from '../pages/InicioPage';

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { vecino_piso: '1A', email: 'vecino@test.com', role: 'usuario' },
  })),
}));

vi.mock('../api/client', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    timestamp: '2026-05-13T12:00:00Z',
    m3_acs: 0.5,
    kwh_calor_abs: 123456, kwh_frio_abs: 61728, m3_acs_abs: 12.3,
    kwh_calor_mes_inicio: 9, kwh_frio_mes_inicio: 2, m3_acs_mes_inicio: 0.1,
    temp_impulsion: 42, temp_retorno: 32, power_w: 150,
  }),
}));

describe('InicioPage', () => {
  it('renders Piscina card', async () => {
    render(
      <MemoryRouter>
        <InicioPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Piscina')).toBeInTheDocument();
    expect(screen.getByText('Apertura')).toBeInTheDocument();
    expect(screen.getByText('20 de junio')).toBeInTheDocument();
    expect(screen.getByText('Cierre')).toBeInTheDocument();
    expect(screen.getByText('30 de agosto')).toBeInTheDocument();
    expect(screen.getByText('Horario')).toBeInTheDocument();
  });

  it('renders Proxima Junta card', async () => {
    render(
      <MemoryRouter>
        <InicioPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Próxima Junta de Vecinos')).toBeInTheDocument();
    expect(screen.getByText('Próximamente. Fecha y hora por determinar.')).toBeInTheDocument();
  });

  it('renders WiFi card', async () => {
    render(
      <MemoryRouter>
        <InicioPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('WiFi de la Comunidad')).toBeInTheDocument();
    expect(screen.getByText('SSID')).toBeInTheDocument();
    expect(screen.getByText('Edificio Elite')).toBeInTheDocument();
    expect(screen.getByText('Clave')).toBeInTheDocument();
  });

  it('renders Contadores de Aerotermia en vivo consumption card', async () => {
    render(
      <MemoryRouter>
        <InicioPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Contadores de Aerotermia en vivo')).toBeInTheDocument();
    expect(screen.getByText('Calefacción')).toBeInTheDocument();
    expect(screen.getByText('Refrigeración')).toBeInTheDocument();
    expect(screen.getByText('ACS')).toBeInTheDocument();
  });

  it('renders heading with greeting', async () => {
    render(
      <MemoryRouter>
        <InicioPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Inicio')).toBeInTheDocument();
  });
});
