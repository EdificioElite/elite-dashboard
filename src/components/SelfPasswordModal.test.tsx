import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelfPasswordModal from './SelfPasswordModal';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  changeOwnPassword: vi.fn(),
}));

describe('SelfPasswordModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three password fields', () => {
    render(<SelfPasswordModal onClose={onClose} />);
    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
  });

  it('shows error when new password is too short', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.type(screen.getByLabelText('Contraseña actual'), 'oldpass');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'Ab1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Ab1');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(screen.getByText(/8 caracteres/)).toBeInTheDocument();
  });

  it('shows error when current password is empty', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NewPass1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'NewPass1');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(screen.getByText(/actual es requerida/)).toBeInTheDocument();
  });

  it('shows error when new password lacks uppercase', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.type(screen.getByLabelText('Contraseña actual'), 'oldpass');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'lowercase1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'lowercase1');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(screen.getByText(/mayúscula/)).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.type(screen.getByLabelText('Contraseña actual'), 'oldpass');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NewPass1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'NewPass2');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(screen.getByText(/no coinciden/)).toBeInTheDocument();
  });

  it('calls changeOwnPassword and shows success', async () => {
    const user = userEvent.setup();
    vi.mocked(client.changeOwnPassword).mockResolvedValueOnce({ message: 'Contraseña actualizada' });
    render(<SelfPasswordModal onClose={onClose} />);
    await user.type(screen.getByLabelText('Contraseña actual'), 'oldpass');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NewPass1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'NewPass1');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(client.changeOwnPassword).toHaveBeenCalledWith('oldpass', 'NewPass1');
    await waitFor(() => {
      expect(screen.getByText(/actualizada/)).toBeInTheDocument();
    });
  });

  it('shows error from API', async () => {
    const user = userEvent.setup();
    vi.mocked(client.changeOwnPassword).mockRejectedValueOnce(new Error('La contraseña actual es incorrecta'));
    render(<SelfPasswordModal onClose={onClose} />);
    await user.type(screen.getByLabelText('Contraseña actual'), 'wrong');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'NewPass1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'NewPass1');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    await waitFor(() => {
      expect(screen.getByText(/incorrecta/)).toBeInTheDocument();
    });
  });

  it('closes on X button click', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Cancelar button click', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on backdrop click', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalled();
  });
});
