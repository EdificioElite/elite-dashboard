import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JuntasGeneralesPage from './JuntasGeneralesPage';

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../api/client', () => ({
  fetchJuntas: vi.fn(),
  downloadJuntaPDF: vi.fn(),
  createJunta: vi.fn(),
  updateJunta: vi.fn(),
  deleteJunta: vi.fn(),
}));

import { useAuthStore } from '../store/auth';
import { fetchJuntas } from '../api/client';

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const mockFetchJuntas = fetchJuntas as ReturnType<typeof vi.fn>;

function setUser(user: { vecino_piso: string; email: string; role: string } | null) {
  mockUseAuthStore.mockImplementation((selector?: any) => {
    const state = { user };
    return selector ? selector(state) : state;
  });
}

function mockJuntas(data: any[]) {
  mockFetchJuntas.mockResolvedValue(data);
}

describe('JuntasGeneralesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUser({ vecino_piso: '1A', email: 'vecino@test.com', role: 'usuario' });
  });

  it('renders title and subtitle', async () => {
    mockJuntas([]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Juntas')).toBeInTheDocument();
    });
    expect(screen.getByText('Edificio Elite — C.P. Pío Río Hortega 46')).toBeInTheDocument();
  });

  it('renders both sections', async () => {
    mockJuntas([]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Vecinales — Juntas Generales')).toBeInTheDocument();
      expect(screen.getByText('Vocales — Juntas de Junta Directiva')).toBeInTheDocument();
    });
  });

  it('shows empty state when no juntas', async () => {
    mockJuntas([]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('No hay juntas vecinales registradas.')).toBeInTheDocument();
      expect(screen.getByText('No hay juntas de directiva registradas.')).toBeInTheDocument();
    });
  });

  it('renders juntas from API', async () => {
    mockJuntas([
      { id: 1, tipo: 'vecinal_ordinaria', fecha: '2026-05-29', file_name: 'JVO-2026-05-29.pdf', created_at: '', updated_at: '' },
      { id: 2, tipo: 'vocal_ordinaria', fecha: '2026-03-25', file_name: 'JDO-2026-03-25.pdf', created_at: '', updated_at: '' },
    ]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('29 de mayo de 2026')).toBeInTheDocument();
      expect(screen.getByText('25 de marzo de 2026')).toBeInTheDocument();
    });
  });

  it('shows descargar button when file exists', async () => {
    mockJuntas([
      { id: 1, tipo: 'vecinal_ordinaria', fecha: '2026-05-29', file_name: 'JVO-2026-05-29.pdf', created_at: '', updated_at: '' },
    ]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Descargar')).toBeInTheDocument();
    });
  });

  it('shows dash when no file', async () => {
    mockJuntas([
      { id: 1, tipo: 'vecinal_ordinaria', fecha: '2026-05-29', file_name: null, created_at: '', updated_at: '' },
    ]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  it('shows crear junta button for admin', async () => {
    setUser({ vecino_piso: '1A', email: 'admin@test.com', role: 'admin' });
    mockJuntas([]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Crear junta')).toBeInTheDocument();
    });
  });

  it('hides crear junta button for vecino', async () => {
    setUser({ vecino_piso: '1A', email: 'vecino@test.com', role: 'usuario' });
    mockJuntas([]);
    render(<MemoryRouter><JuntasGeneralesPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.queryByText('Crear junta')).not.toBeInTheDocument();
    });
  });
});
