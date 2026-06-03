import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteUserModal from './InviteUserModal';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  inviteUser: vi.fn(),
  apiFetch: vi.fn(),
}));

describe('InviteUserModal', () => {
  const onClose = vi.fn();
  const onSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.apiFetch).mockResolvedValue([{ piso: '1A' }, { piso: '2B' }]);
  });

  it('renders form fields', () => {
    render(<InviteUserModal onClose={onClose} onSaved={onSaved} />);
    expect(screen.getByText('Invitar usuario')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('vecino@email.com')).toBeInTheDocument();
  });

  it('shows error when email is empty', async () => {
    render(<InviteUserModal onClose={onClose} onSaved={onSaved} />);
    const form = screen.getByRole('dialog').querySelector('form')!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText('El email es requerido')).toBeInTheDocument();
    });
  });

  it('calls inviteUser and shows success', async () => {
    const user = userEvent.setup();
    vi.mocked(client.inviteUser).mockResolvedValueOnce({ message: 'Invitación enviada correctamente' });
    render(<InviteUserModal onClose={onClose} onSaved={onSaved} />);
    await user.type(screen.getByPlaceholderText('vecino@email.com'), 'test@test.com');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    expect(client.inviteUser).toHaveBeenCalledWith('test@test.com', undefined);
    await waitFor(() => {
      expect(screen.getByText('Invitación enviada correctamente')).toBeInTheDocument();
    });
  });

  it('shows API error', async () => {
    const user = userEvent.setup();
    vi.mocked(client.inviteUser).mockRejectedValueOnce(new Error('Error del servidor'));
    render(<InviteUserModal onClose={onClose} onSaved={onSaved} />);
    await user.type(screen.getByPlaceholderText('vecino@email.com'), 'test@test.com');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    await waitFor(() => {
      expect(screen.getByText('Error del servidor')).toBeInTheDocument();
    });
  });

  it('closes on X button click', async () => {
    const user = userEvent.setup();
    render(<InviteUserModal onClose={onClose} onSaved={onSaved} />);
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Cancelar button click', async () => {
    const user = userEvent.setup();
    render(<InviteUserModal onClose={onClose} onSaved={onSaved} />);
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
