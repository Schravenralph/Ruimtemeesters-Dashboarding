import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from './StatusIndicator';

describe('StatusIndicator', () => {
  it('renders online status', () => {
    render(<StatusIndicator status="online" />);
    expect(screen.getByText('Online')).toBeDefined();
  });

  it('renders offline status', () => {
    render(<StatusIndicator status="offline" />);
    expect(screen.getByText('Offline')).toBeDefined();
  });

  it('renders warning status', () => {
    render(<StatusIndicator status="warning" />);
    expect(screen.getByText('Waarschuwing')).toBeDefined();
  });

  it('renders error status', () => {
    render(<StatusIndicator status="error" />);
    expect(screen.getByText('Fout')).toBeDefined();
  });

  it('renders custom label', () => {
    render(<StatusIndicator status="online" label="Server actief" />);
    expect(screen.getByText('Server actief')).toBeDefined();
  });
});
