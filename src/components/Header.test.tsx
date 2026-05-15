import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { useAuthStore } from '../store/auth';

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn(),
}));

const mockStore = vi.mocked(useAuthStore);

function renderHeader(initialRoute = '/inicio') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Header />
    </MemoryRouter>
  );
}

describe('Header', () => {
  beforeEach(() => {
    mockStore.mockReturnValue({
      user: { vecino_piso: '1A', email: 'vecino@test.com', is_admin: false },
      logout: vi.fn(),
    });
  });

  it('renders page nav links', () => {
    renderHeader();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Aerotermia')).toBeInTheDocument();
    expect(screen.getByText('Juntas')).toBeInTheDocument();
    expect(screen.getByText('Contactos')).toBeInTheDocument();
  });

  it('renders logo', () => {
    renderHeader();
    expect(screen.getByAltText('Edificio Elite')).toBeInTheDocument();
  });

  it('renders hamburger menu button', () => {
    renderHeader();
    expect(screen.getByLabelText('Abrir menu')).toBeInTheDocument();
  });

  it('renders user initials avatar button', () => {
    renderHeader();
    expect(screen.getByTitle('vecino@test.com')).toBeInTheDocument();
    expect(screen.getByText('1A')).toBeInTheDocument();
  });

  it('opens user dropdown on avatar click', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByTitle('vecino@test.com'));
    expect(screen.getByText('Cambiar contrasena')).toBeInTheDocument();
    expect(screen.getByText('Salir')).toBeInTheDocument();
  });

  it('does not show admin nav when user is not admin', () => {
    renderHeader();
    expect(screen.queryByText('Vecinos')).not.toBeInTheDocument();
  });

  it('shows admin nav when user is admin', () => {
    mockStore.mockReturnValue({
      user: { vecino_piso: '1A', email: 'admin@test.com', is_admin: true },
      logout: vi.fn(),
    });
    renderHeader();
    expect(screen.getByText('Vecinos')).toBeInTheDocument();
  });
});
