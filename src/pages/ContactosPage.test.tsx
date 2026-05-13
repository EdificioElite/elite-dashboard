import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContactosPage from './ContactosPage';

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { vecino_piso: '1A', email: 'vecino@test.com', is_admin: false },
  })),
}));

describe('ContactosPage', () => {
  it('renders Administrador card', () => {
    render(
      <MemoryRouter>
        <ContactosPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Administrador de Fincas')).toBeInTheDocument();
    expect(screen.getByText('Jose Maria Lopez')).toBeInTheDocument();
    expect(screen.getByText('+34 666 111 222')).toBeInTheDocument();
    expect(screen.getByText('josemaria@administracionfincas.es')).toBeInTheDocument();
  });

  it('renders Mantenedor card', () => {
    render(
      <MemoryRouter>
        <ContactosPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Mantenedor de Climatizacion')).toBeInTheDocument();
    expect(screen.getByText('Climatizacion Elite S.L.')).toBeInTheDocument();
    expect(screen.getByText('+34 666 333 444')).toBeInTheDocument();
    expect(screen.getByText('mantenimiento@climatizacionelite.es')).toBeInTheDocument();
  });

  it('renders email as mailto links', () => {
    render(
      <MemoryRouter>
        <ContactosPage />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link');
    const emails = links.filter((l) => l.getAttribute('href')?.startsWith('mailto:'));
    expect(emails.length).toBe(2);
  });

  it('renders phone as tel links', () => {
    render(
      <MemoryRouter>
        <ContactosPage />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link');
    const tels = links.filter((l) => l.getAttribute('href')?.startsWith('tel:'));
    expect(tels.length).toBe(2);
  });
});
