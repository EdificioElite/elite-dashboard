import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContactosPage from './ContactosPage';

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { vecino_piso: '1A', email: 'vecino@test.com', role: 'usuario' },
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
    expect(screen.getByText('Martin y Lorente — Juanjo Montalvo')).toBeInTheDocument();
    expect(screen.getByText('juanjomontalvo@martinylorente.es')).toBeInTheDocument();
    expect(screen.getByText('www.martinylorente.es')).toBeInTheDocument();
    expect(screen.getByText('91 796 00 43')).toBeInTheDocument();
    expect(screen.getByText('91 505 53 10')).toBeInTheDocument();
    expect(screen.getByText('91 060 79 46')).toBeInTheDocument();
  });

  it('renders Ness card', () => {
    render(
      <MemoryRouter>
        <ContactosPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Mantenimiento Aerotermia')).toBeInTheDocument();
    expect(screen.getByText('Ness')).toBeInTheDocument();
    expect(screen.getByText('+34 602 22 52 97')).toBeInTheDocument();
    expect(screen.getByText('+34 917 99 26 88')).toBeInTheDocument();
    expect(screen.getByText('clientes@ness.es')).toBeInTheDocument();
  });

  it('renders Cristina card', () => {
    render(
      <MemoryRouter>
        <ContactosPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Limpieza y Paquetería')).toBeInTheDocument();
    expect(screen.getByText('Cristina')).toBeInTheDocument();
    expect(screen.getByText('info@cnlimpiezas.com')).toBeInTheDocument();
    expect(screen.getByText('634 466 849')).toBeInTheDocument();
  });

  it('renders Presidencia y Junta Directiva card', () => {
    render(
      <MemoryRouter>
        <ContactosPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Presidencia y Junta Directiva')).toBeInTheDocument();
    expect(screen.getByText('Comunidad de Propietarios')).toBeInTheDocument();
    expect(screen.getByText('cpedificioelite@gmail.com')).toBeInTheDocument();
  });

  it('renders email as mailto links', () => {
    render(
      <MemoryRouter>
        <ContactosPage />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link');
    const emails = links.filter((l) => l.getAttribute('href')?.startsWith('mailto:'));
    expect(emails.length).toBe(4);
  });

  it('renders phone as tel links', () => {
    render(
      <MemoryRouter>
        <ContactosPage />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link');
    const tels = links.filter((l) => l.getAttribute('href')?.startsWith('tel:'));
    expect(tels.length).toBe(6);
  });
});
