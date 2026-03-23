/**
 * E2E Screenshot + Email Script
 *
 * Takes screenshots of key dashboard features using Playwright,
 * then emails them via SMTP.
 *
 * Usage: pnpm run e2e:screenshots
 * Requires: running dev server on port 3303, SMTP env vars
 */

import { chromium, type Page } from 'playwright';
import { getEmailService } from '../src/server/services/email.service.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3303';
const RECIPIENT = process.env.E2E_EMAIL_TO || 'ralphdrmoller@gmail.com';
const SCREENSHOT_DIR = path.join(process.cwd(), 'e2e-screenshots');

interface Screenshot {
  name: string;
  filename: string;
  description: string;
}

async function takeScreenshots(): Promise<Screenshot[]> {
  const screenshots: Screenshot[] = [];

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('[E2E] Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  async function screenshot(name: string, description: string, url?: string) {
    const filename = `${name}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    if (url) {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
        console.log(`[E2E] Warning: networkidle timeout for ${url}, continuing...`);
      });
    }

    // Wait a bit for charts to render
    await page.waitForTimeout(2000);

    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`[E2E] Screenshot: ${name} → ${filepath}`);

    screenshots.push({ name, filename, description });
  }

  try {
    // 1. Landing / Overzicht dashboard
    console.log('[E2E] Taking screenshots of features...');
    await screenshot('01-overzicht-dashboard', 'Overzicht dashboard — landing page with theme navigation', `${BASE_URL}/dashboard/overzicht`);

    // 2. Bevolking dashboard
    await screenshot('02-bevolking-dashboard', 'Bevolking dashboard — population data with age groups (Primos-aligned: 0-14, 15-29, 30-44, 45-64, 65-74, 75+)', `${BASE_URL}/dashboard/bevolking`);

    // 3. Huishoudens dashboard
    await screenshot('03-huishoudens-dashboard', 'Huishoudens dashboard — household composition data', `${BASE_URL}/dashboard/huishoudens`);

    // 4. Woningen dashboard
    await screenshot('04-woningen-dashboard', 'Woningen dashboard — housing stock data', `${BASE_URL}/dashboard/woningen`);

    // 5. Woningtekort dashboard
    await screenshot('05-woningtekort-dashboard', 'Woningtekort dashboard — housing shortage analysis with CBS nieuwbouw/sloop data', `${BASE_URL}/dashboard/woningtekort`);

    // 6. Login page
    await screenshot('06-login-page', 'Login page with demo credentials', `${BASE_URL}/login`);

    // 7. Help page
    await screenshot('07-help-page', 'Help & documentation page', `${BASE_URL}/help`);

    // 8. Data download page
    await screenshot('08-data-download', 'Data download page — CSV/JSON export with CBS source selection', `${BASE_URL}/download`);

    // 9. Tab bar (navigate to create multiple tabs)
    await page.goto(`${BASE_URL}/dashboard/bevolking`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.goto(`${BASE_URL}/dashboard/huishoudens`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await screenshot('09-multi-tab', 'Multiple presentation tabs — Primos-style multi-tab navigation');

    // 10. API health check
    await screenshot('10-api-health', 'API health endpoint', `${BASE_URL}/api/health`);

  } catch (err) {
    console.error('[E2E] Error during screenshots:', err);
  } finally {
    await browser.close();
  }

  return screenshots;
}

function buildEmailHtml(screenshots: Screenshot[]): string {
  const date = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' });

  return `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
  h2 { color: #374151; margin-top: 32px; }
  .screenshot { margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .screenshot img { width: 100%; display: block; }
  .screenshot .caption { padding: 8px 12px; background: #f9fafb; font-size: 13px; color: #6b7280; }
  .meta { color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-green { background: #d1fae5; color: #065f46; }
</style></head>
<body>
  <h1>Ruimtemeesters Dashboard — E2E Screenshots</h1>
  <p>Automatisch gegenereerde screenshots van de belangrijkste features.</p>
  <p>
    <span class="badge badge-blue">${screenshots.length} screenshots</span>
    <span class="badge badge-green">CBS real data</span>
  </p>

  <h2>Features</h2>
  ${screenshots.map((s, i) => `
  <div class="screenshot">
    <img src="cid:screenshot-${i}" alt="${s.name}" />
    <div class="caption"><strong>${s.name}</strong> — ${s.description}</div>
  </div>
  `).join('\n')}

  <h2>Data Sources</h2>
  <ul>
    <li><strong>Bevolking:</strong> CBS StatLine 03759ned — Bevolking per geslacht, leeftijd, regio</li>
    <li><strong>Huishoudens:</strong> CBS StatLine 71486ned — Huishoudens per samenstelling, regio</li>
    <li><strong>Woningen:</strong> CBS StatLine 82550NED — Voorraad woningen per eigendom, type</li>
    <li><strong>Woningmutaties:</strong> CBS StatLine 81955NED — Nieuwbouw, sloop, voorraad</li>
    <li><strong>Prognose:</strong> CBS StatLine 84646NED — Nationale bevolkingsprognose 2025-2060</li>
  </ul>
  <p>Alle data: <strong>Bron: CBS, StatLine (opendata.cbs.nl). Licentie: CC-BY 4.0.</strong></p>

  <div class="meta">
    <p>Gegenereerd op: ${date}</p>
    <p>Platform: Ruimtemeesters Dashboard v0.1.0</p>
    <p>Tech stack: React 19, TypeScript, Express 5, PostgreSQL, Recharts</p>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  E2E Screenshots + Email — Ruimtemeesters   ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Take screenshots
  const screenshots = await takeScreenshots();

  if (screenshots.length === 0) {
    console.error('[E2E] No screenshots taken — aborting email');
    process.exit(1);
  }

  // Build email
  const html = buildEmailHtml(screenshots);
  const attachments = screenshots.map((s, i) => ({
    filename: s.filename,
    content: fs.readFileSync(path.join(SCREENSHOT_DIR, s.filename)),
    contentType: 'image/png',
    cid: `screenshot-${i}`,
  }));

  // Send email
  console.log(`\n[Email] Sending ${screenshots.length} screenshots to ${RECIPIENT}...`);
  const emailService = getEmailService();

  if (!emailService.isAvailable()) {
    console.error('[Email] SMTP not configured — cannot send. Check SMTP_* env vars.');
    console.log('[Email] Screenshots saved to:', SCREENSHOT_DIR);
    process.exit(1);
  }

  await emailService.send({
    to: RECIPIENT,
    subject: `Ruimtemeesters Dashboard — E2E Screenshots (${new Date().toLocaleDateString('nl-NL')})`,
    html,
    attachments,
  });

  console.log(`\n[Done] Email sent to ${RECIPIENT} with ${screenshots.length} screenshots.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
