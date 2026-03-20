/**
 * Dutch error message translations for API responses.
 * Used to provide user-friendly error messages in Dutch.
 */

const errorMessages: Record<string, string> = {
  // Auth
  'Authentication required': 'Authenticatie vereist. Log in om door te gaan.',
  'Invalid credentials': 'Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.',
  'Invalid token': 'Ongeldige sessie. Log opnieuw in.',
  'User not found': 'Gebruiker niet gevonden.',
  'Email already registered': 'Dit e-mailadres is al geregistreerd.',
  'Insufficient permissions': 'Onvoldoende rechten voor deze actie.',

  // Data
  'No data provided': 'Geen data aangeleverd.',
  'Unknown data source': 'Onbekende databron.',
  'Maximum 50,000 rows per import': 'Maximaal 50.000 rijen per import.',
  'Import failed': 'Import mislukt.',

  // Dashboard
  'Dashboard not found': 'Dashboard niet gevonden.',
  'Maximum of 5 custom dashboards reached': 'Maximum van 5 aangepaste dashboards bereikt.',
  'Theme not found': 'Thema niet gevonden.',
  'Tile not found in this theme': 'Tegel niet gevonden in dit thema.',
  'Shared dashboard not found or expired': 'Gedeeld dashboard niet gevonden of verlopen.',

  // Policy
  'Policy not found': 'Beleid niet gevonden.',
  'Access denied by policy': 'Toegang geweigerd door beleid.',

  // General
  'No updates provided': 'Geen wijzigingen opgegeven.',
  'Validation failed': 'Validatie mislukt.',
  'Invalid request': 'Ongeldig verzoek.',
  'Internal server error': 'Interne serverfout. Probeer het later opnieuw.',
  'Too many requests': 'Te veel verzoeken. Probeer het over enkele seconden opnieuw.',
  'Endpoint not found': 'Dit API-eindpunt bestaat niet.',
  'Cannot delete your own account': 'Je kunt je eigen account niet verwijderen.',
  'Area not found': 'Gebied niet gevonden.',
  'Saved filter not found': 'Opgeslagen filter niet gevonden.',
};

export function translateError(message: string): string {
  return errorMessages[message] || message;
}

export function getErrorMessages(): Record<string, string> {
  return { ...errorMessages };
}
