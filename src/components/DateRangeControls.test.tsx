import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DateRangeControls from './DateRangeControls';

describe('DateRangeControls', () => {
  const defaultProps = {
    preset: '7d' as const,
    desdeInput: '2026-04-28T00:00',
    hastaInput: '2026-05-28T23:59',
    onPresetChange: vi.fn(),
    onCustomApply: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders presets as segmented control buttons', () => {
    render(<DateRangeControls {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(tabs[0]).toHaveTextContent('24h');
    expect(tabs[1]).toHaveTextContent('7 dias');
    expect(tabs[2]).toHaveTextContent('30 dias');
    expect(tabs[3]).toHaveTextContent('3 meses');
    expect(tabs[4]).toHaveTextContent('1 año');
  });

  it('marks the correct preset as selected', () => {
    render(<DateRangeControls {...defaultProps} preset="30d" />);
    const selected = screen.getByRole('tab', { selected: true });
    expect(selected).toHaveTextContent('30 dias');
  });

  it('shows range label in custom button', () => {
    render(<DateRangeControls {...defaultProps} />);
    expect(screen.getByText(/28 abr .+ 28 may 2026/)).toBeInTheDocument();
  });

  it('opens popover when custom button is clicked', () => {
    render(<DateRangeControls {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
    expect(screen.getByText('Aplicar')).toBeInTheDocument();
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-04-28T00:00');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-05-28T23:59');
  });

  it('closes popover and calls onCustomApply when Aplicar is clicked', () => {
    const onCustomApply = vi.fn();
    render(<DateRangeControls {...defaultProps} onCustomApply={onCustomApply} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Aplicar'));
    expect(onCustomApply).toHaveBeenCalledWith('2026-04-28T00:00', '2026-05-28T23:59');
    expect(screen.queryByText('Aplicar')).not.toBeInTheDocument();
  });

  it('calls onPresetChange when a preset is clicked', () => {
    const onPresetChange = vi.fn();
    render(<DateRangeControls {...defaultProps} onPresetChange={onPresetChange} />);
    fireEvent.click(screen.getByRole('tab', { name: '30 dias' }));
    expect(onPresetChange).toHaveBeenCalledWith('30d');
  });

  it('highlights custom button when preset is null', () => {
    render(<DateRangeControls {...defaultProps} preset={null} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-accent');
  });

  it('omits year from first date when both dates are in same year', () => {
    render(
      <DateRangeControls {...defaultProps} desdeInput="2026-01-15T00:00" hastaInput="2026-12-20T00:00" />
    );
    expect(screen.getByText(/15 ene .+ 20 dic 2026/)).toBeInTheDocument();
  });

  it('shows both years when dates span different years', () => {
    render(
      <DateRangeControls {...defaultProps} desdeInput="2025-12-01T00:00" hastaInput="2026-01-15T00:00" />
    );
    expect(screen.getByText(/1 dic 2025 .+ 15 ene 2026/)).toBeInTheDocument();
  });

  it('shows "Personalizado" when inputs are empty', () => {
    render(
      <DateRangeControls {...defaultProps} desdeInput="" hastaInput="" />
    );
    expect(screen.getByText('Personalizado')).toBeInTheDocument();
  });
});
