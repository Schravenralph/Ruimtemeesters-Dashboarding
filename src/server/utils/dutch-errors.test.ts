import { describe, it, expect } from 'vitest';
import { translateError, getErrorMessages } from './dutch-errors';

describe('dutch-errors', () => {
  it('translates known error messages', () => {
    expect(translateError('Authentication required')).toBe('Authenticatie vereist. Log in om door te gaan.');
    expect(translateError('Invalid credentials')).toBe('Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.');
    expect(translateError('Dashboard not found')).toBe('Dashboard niet gevonden.');
  });

  it('returns original message for unknown errors', () => {
    expect(translateError('Some unknown error')).toBe('Some unknown error');
  });

  it('translates data-related errors', () => {
    expect(translateError('No data provided')).toBe('Geen data aangeleverd.');
    expect(translateError('Import failed')).toBe('Import mislukt.');
  });

  it('translates permission errors', () => {
    expect(translateError('Insufficient permissions')).toBe('Onvoldoende rechten voor deze actie.');
    expect(translateError('Access denied by policy')).toBe('Toegang geweigerd door beleid.');
  });

  it('getErrorMessages returns all messages', () => {
    const messages = getErrorMessages();
    expect(Object.keys(messages).length).toBeGreaterThan(10);
    expect(messages['Authentication required']).toBeTruthy();
  });
});
