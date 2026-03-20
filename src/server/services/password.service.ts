import bcrypt from 'bcryptjs';

/**
 * Password utilities with strength validation.
 */

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  suggestions: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const suggestions: string[] = [];

  // Length check
  if (password.length >= 8) score++;
  else suggestions.push('Minimaal 8 tekens');

  if (password.length >= 12) score++;

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else suggestions.push('Gebruik hoofd- en kleine letters');

  if (/\d/.test(password)) score++;
  else suggestions.push('Voeg een cijfer toe');

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  else suggestions.push('Voeg een speciaal teken toe');

  // Cap at 4
  score = Math.min(4, score);

  const labels = ['Zeer zwak', 'Zwak', 'Redelijk', 'Sterk', 'Zeer sterk'];

  return {
    score,
    label: labels[score],
    suggestions,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if a password matches common weak patterns.
 */
export function isCommonPassword(password: string): boolean {
  const common = [
    'password', '12345678', 'qwerty123', 'admin123', 'letmein',
    'welcome1', 'password1', 'admin1234', '12345678', 'test1234',
  ];
  return common.includes(password.toLowerCase());
}
