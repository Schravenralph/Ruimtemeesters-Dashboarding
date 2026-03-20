import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CopyButton } from './CopyButton';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('CopyButton', () => {
  it('renders with label', () => {
    render(<CopyButton text="test" label="Copy code" />);
    expect(screen.getByText('Copy code')).toBeDefined();
  });

  it('copies text to clipboard on click', async () => {
    render(<CopyButton text="hello world" label="Copy" />);
    fireEvent.click(screen.getByText('Copy'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world');
  });
});
