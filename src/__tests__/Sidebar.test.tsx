import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

describe('Sidebar', () => {
  it('renders admin and edificio sections', () => {
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
