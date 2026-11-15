import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartTooltip, { chartTooltipWrapperStyle } from './ChartTooltip';

const payload = [
  { name: 'Potencia', value: 1234.5, color: '#B53228' },
  { name: 'Contador', value: 56, color: '#D4897A' },
];

describe('ChartTooltip', () => {
  it('does not render without an active point', () => {
    const { container } = render(<ChartTooltip active={false} payload={payload} label="22 nov" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the label and values with their units', () => {
    const { container } = render(
      <ChartTooltip
        active
        payload={payload}
        label="22 nov"
        unit={{ Potencia: 'W', Contador: 'kWh' }}
      />
    );
    expect(screen.getByText('22 nov')).toBeInTheDocument();
    expect(container.textContent).toContain('1234,50 W');
    expect(container.textContent).toContain('56 kWh');
  });

  it('shows a dash for missing values', () => {
    render(<ChartTooltip active payload={[{ name: 'Potencia', value: null, color: '#B53228' }]} label="22 nov" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('anchors the popup below the chart area', () => {
    expect(chartTooltipWrapperStyle.top).toBe('100%');
    expect(chartTooltipWrapperStyle.transform).toBe('none');
  });
});
