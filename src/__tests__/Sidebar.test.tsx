import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn((selector?: any) => {
    const state = { user: { is_admin: true }, token: 'test-token', loading: false };
    return selector ? selector(state) : state;
  }),
}));

describe('Sidebar', () => {
  it('renders admin and edificio sections when admin', () => {
    const { getByText } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(getByText('Admin')).toBeInTheDocument();
    expect(getByText('Edificio')).toBeInTheDocument();
  });

  it('renders all navigation items', () => {
    const { getByText, getAllByText } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(getByText('Vecinos')).toBeInTheDocument();
    expect(getByText('Usuarios')).toBeInTheDocument();
    expect(getAllByText('Aerotermia')).toHaveLength(2);
    expect(getByText('Inicio')).toBeInTheDocument();
    expect(getByText('Juntas')).toBeInTheDocument();
    expect(getByText('Contactos')).toBeInTheDocument();
  });
});
