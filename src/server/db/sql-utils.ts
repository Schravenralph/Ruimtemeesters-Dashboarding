const IDENT_RE = /^[a-z_][a-z0-9_]*$/i;

/**
 * Validate and quote a SQL identifier (table name, column name).
 * Throws if the name contains characters outside [a-zA-Z0-9_].
 */
export function safeIdent(name: string): string {
  if (!IDENT_RE.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name}"`;
}
