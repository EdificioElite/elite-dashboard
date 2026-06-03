import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangePasswordModal from './ChangePasswordModal';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  changePassword: vi.fn(),
}));

describe('ChangePasswordModal', () => {
  const onClose = vi.fn();
  const onSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user name and form fields', () => {
    render(
      <ChangePasswordModal userId={1} userName="Vecino 1A — Piso 1A" onClose={onClose} onSaved={onSaved} />
    );
    expect(screen.getByText('Vecino 1A — Piso 1A')).toBeInTheDocument();
    expect(screen.getByText('Cambiar contraseña')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Repetir contraseña')).toBeInTheDocument();
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();
    render(
      <ChangePasswordModal userId={1} userName="Vecino" onClose={onClose} onSaved={onSaved} />
    );
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'abc');
    await user.type(screen.getByPlaceholderText('Repetir contraseña'), 'abc');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(screen.getByText(/6 caracteres/)).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(
      <ChangePasswordModal userId={1} userName="Vecino" onClose={onClose} onSaved={onSaved} />
    );
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'abcdef');
    await user.type(screen.getByPlaceholderText('Repetir contraseña'), 'ghijkl');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(screen.getByText(/no coinciden/)).toBeInTheDocument();
  });

  it('calls changePassword and onSaved on success', async () => {
    const user = userEvent.setup();
    vi.mocked(client.changePassword).mockResolvedValueOnce({ message: 'Contraseña actualizada' });
    render(
      <ChangePasswordModal userId={1} userName="Vecino" onClose={onClose} onSaved={onSaved} />
    );
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'abcdef');
    await user.type(screen.getByPlaceholderText('Repetir contraseña'), 'abcdef');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(client.changePassword).toHaveBeenCalledWith(1, 'abcdef');
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('shows API error', async () => {
    const user = userEvent.setup();
    vi.mocked(client.changePassword).mockRejectedValueOnce(new Error('Error al cambiar contraseña'));
    render(
      <ChangePasswordModal userId={1} userName="Vecino" onClose={onClose} onSaved={onSaved} />
    );
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'abcdef1');
    await user.type(screen.getByPlaceholderText('Repetir contraseña'), 'abcdef1');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    await waitFor(() => {
      expect(screen.getByText('Error al cambiar contraseña')).toBeInTheDocument();
    });
  });

  it('closes on X button click', async () => {
    const user = userEvent.setup();
    render(
      <ChangePasswordModal userId={1} userName="Vecino" onClose={onClose} onSaved={onSaved} />
    );
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Cancelar button click', async () => {
    const user = userEvent.setup();
    render(
      <ChangePasswordModal userId={1} userName="Vecino" onClose={onClose} onSaved={onSaved} />
    );
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
