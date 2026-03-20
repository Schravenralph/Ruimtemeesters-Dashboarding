import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TruncatedText } from './TruncatedText';

describe('TruncatedText', () => {
  it('renders short text without truncation', () => {
    render(<TruncatedText text="Short text" />);
    expect(screen.getByText('Short text')).toBeDefined();
    expect(screen.queryByText('meer')).toBeNull();
  });

  it('truncates long text', () => {
    const longText = 'A'.repeat(200);
    render(<TruncatedText text={longText} maxLength={50} />);
    expect(screen.getByText('meer')).toBeDefined();
  });

  it('expands on click', () => {
    const longText = 'A'.repeat(200);
    render(<TruncatedText text={longText} maxLength={50} />);

    fireEvent.click(screen.getByText('meer'));
    expect(screen.getByText('minder')).toBeDefined();
  });

  it('collapses on second click', () => {
    const longText = 'A'.repeat(200);
    render(<TruncatedText text={longText} maxLength={50} />);

    fireEvent.click(screen.getByText('meer'));
    fireEvent.click(screen.getByText('minder'));
    expect(screen.getByText('meer')).toBeDefined();
  });

  it('respects custom maxLength', () => {
    render(<TruncatedText text="Hello World!" maxLength={5} />);
    expect(screen.getByText('meer')).toBeDefined();
  });
});
