/**
 * Send PR analysis + Primos gap analysis email
 */

import { getEmailService } from '../src/server/services/email.service.js';
import dotenv from 'dotenv';

dotenv.config();

const RECIPIENT = process.env.E2E_EMAIL_TO || 'ralphdrmoller@gmail.com';

const html = `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
  h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
  h2 { color: #374151; margin-top: 32px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  h3 { color: #6b7280; margin-top: 24px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; font-size: 13px; }
  th { background: #f9fafb; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; margin-right: 4px; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-gray { background: #f3f4f6; color: #374151; }
  .meta { color: #9ca3af; font-size: 12px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  .section { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 12px 0; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; }
  .check { color: #059669; }
  .cross { color: #dc2626; }
</style></head>
<body>

<h1>Ruimtemeesters — PR Analysis & Feature Gap Report</h1>
<p>Gegenereerd: ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}</p>

<!-- ====== OPEN PR ====== -->
<h2>Open Pull Requests</h2>

<div class="section">
  <h3><a href="https://github.com/Schravenralph/Ruimtemeesters-TSA/pull/1">PR #1: TSA Engine Phase 1 — cohort-component + ML ensemble</a></h3>
  <p>
    <span class="badge badge-blue">+2,157 lines</span>
    <span class="badge badge-green">10 commits</span>
    <span class="badge badge-green">48 tests passing</span>
  </p>

  <p><strong>What it adds:</strong></p>
  <ul>
    <li>Cohort-component demographic projection engine (fertility, mortality, migration)</li>
    <li>3 base models: Prophet, SARIMA, Holt-Winters</li>
    <li>Walk-forward cross-validation + inverse-MAE weighted ensemble</li>
    <li>Feature engineering pipeline (lags, rolling stats, growth, trend)</li>
    <li>FastAPI service with API key auth</li>
    <li>CBS data loader with gemeente merger detection</li>
    <li>Dockerfile + CLI runner</li>
  </ul>

  <p><strong>Review findings (all resolved):</strong></p>
  <table>
    <tr><th>Finding</th><th>Source</th><th>Severity</th><th>Status</th></tr>
    <tr><td>Ensemble weight misalignment on model failure</td><td>Gitar</td><td>High</td><td><span class="check">&#10004;</span> Fixed</td></tr>
    <tr><td>Cohort drops oldest age group each year</td><td>Gitar</td><td>High</td><td><span class="check">&#10004;</span> Fixed</td></tr>
    <tr><td>Double migration at top-age bucket</td><td>Cursor Bugbot</td><td>High</td><td><span class="check">&#10004;</span> Fixed</td></tr>
    <tr><td>MAE=0 gets zero ensemble weight</td><td>Cursor Bugbot</td><td>Medium</td><td><span class="check">&#10004;</span> Fixed</td></tr>
    <tr><td>_band_midpoint triplicated + inconsistent</td><td>Cursor Bugbot</td><td>Low</td><td><span class="check">&#10004;</span> Fixed</td></tr>
  </table>

  <p><strong>Recommendation:</strong> Ready to merge. All automated review findings resolved with regression tests.</p>
</div>

<!-- ====== PRIMOS GAP ANALYSIS ====== -->
<h2>Primos Feature Gap Analysis</h2>
<p>Comparison of Primos Datawonen features vs. what we have in Ruimtemeesters-Dashboarding.</p>

<h3>What We Have (Primos parity or better)</h3>
<table>
  <tr><th>Feature</th><th>Primos</th><th>Ours</th><th>Status</th></tr>
  <tr><td>Population by age group</td><td>6 groups absolute + relative</td><td>6 Primos-aligned groups + CBS data</td><td><span class="badge badge-green">Parity</span></td></tr>
  <tr><td>Households by composition</td><td>5 types + total</td><td>5 CBS types + total</td><td><span class="badge badge-green">Parity</span></td></tr>
  <tr><td>Households by age of ref. person</td><td>5 age groups</td><td>5 age groups (CBS leeftijd)</td><td><span class="badge badge-green">Parity</span></td></tr>
  <tr><td>Woningvoorraad</td><td>Stock + mutations</td><td>Stock + nieuwbouw/sloop + tekort</td><td><span class="badge badge-green">Parity</span></td></tr>
  <tr><td>Geographic levels</td><td>10 levels</td><td>4 levels (land/prov/COROP/gem)</td><td><span class="badge badge-yellow">Partial</span></td></tr>
  <tr><td>Presentation tabs</td><td>Multiple tabs</td><td>Multiple tabs (PresentationContext)</td><td><span class="badge badge-green">Parity</span></td></tr>
  <tr><td>Vergelijkingsniveau</td><td>Comparison areas</td><td>Inline comparison in FilterBar</td><td><span class="badge badge-green">Parity</span></td></tr>
  <tr><td>Data transformations</td><td>3 (%, growth, z-scores)</td><td>3 (%, growth, z-scores)</td><td><span class="badge badge-green">Parity</span></td></tr>
  <tr><td>Export formats</td><td>9 formats</td><td>CSV, JSON, PNG, PDF, Excel</td><td><span class="badge badge-yellow">Partial</span></td></tr>
  <tr><td>Chart types</td><td>11 loaded</td><td>20+ chart components</td><td><span class="badge badge-blue">Ahead</span></td></tr>
  <tr><td>RBAC/ABAC</td><td>Basic login</td><td>4 roles + policy engine</td><td><span class="badge badge-blue">Ahead</span></td></tr>
  <tr><td>Custom dashboards</td><td>Not present</td><td>Full CRUD + drag-drop tiles</td><td><span class="badge badge-blue">Ahead</span></td></tr>
  <tr><td>Sharing</td><td>URL + social</td><td>Token-based 30-day links + embed</td><td><span class="badge badge-green">Parity</span></td></tr>
  <tr><td>Print</td><td>A3/A4/A5 formats</td><td>PrintPage with auto-trigger</td><td><span class="badge badge-green">Parity</span></td></tr>
  <tr><td>CBS data attribution</td><td>ABF source labels</td><td>CBS CC-BY 4.0 attribution</td><td><span class="badge badge-green">Parity</span></td></tr>
</table>

<h3>What Primos Has That We Don't</h3>
<table>
  <tr><th>Feature</th><th>Primos Description</th><th>Priority</th><th>Effort</th></tr>
  <tr>
    <td><strong>Choropleth map (real GIS)</strong></td>
    <td>OpenLayers 9 with actual gemeente polygons, zoom, labels, layers</td>
    <td><span class="badge badge-red">High</span></td>
    <td>Large — needs MapLibre/Leaflet + GeoJSON boundaries</td>
  </tr>
  <tr>
    <td><strong>Point map (graduated symbols)</strong></td>
    <td>Alternative map with circle sizes proportional to values</td>
    <td><span class="badge badge-yellow">Medium</span></td>
    <td>Medium — after choropleth is done</td>
  </tr>
  <tr>
    <td><strong>Kleurentabel (color-coded table)</strong></td>
    <td>Table cells colored by value intensity, like a heatmap</td>
    <td><span class="badge badge-yellow">Medium</span></td>
    <td>Small — extend existing DataTable</td>
  </tr>
  <tr>
    <td><strong>Klassenindeling (classification editor)</strong></td>
    <td>Full class break config: manual bounds, 2-15 classes, color scheme, reverse</td>
    <td><span class="badge badge-yellow">Medium</span></td>
    <td>Medium — ClassificationEditor exists but needs wiring</td>
  </tr>
  <tr>
    <td><strong>Period animation (Afspelen)</strong></td>
    <td>Auto-play through years with animation controls</td>
    <td><span class="badge badge-yellow">Medium</span></td>
    <td>Small — TimelineSlider exists, add play/pause</td>
  </tr>
  <tr>
    <td><strong>Selectie-assistent (wizard)</strong></td>
    <td>Guided step-by-step wizard for building presentations</td>
    <td><span class="badge badge-gray">Low</span></td>
    <td>Medium — SelectionWizard component exists but may need work</td>
  </tr>
  <tr>
    <td><strong>Workspace save/load (.xml)</strong></td>
    <td>Save full workspace state to XML, reopen later</td>
    <td><span class="badge badge-gray">Low</span></td>
    <td>Medium — serialize PresentationContext to JSON file</td>
  </tr>
  <tr>
    <td><strong>Woningmarktregio / Woningwetregio / Krimp</strong></td>
    <td>6 additional geographic levels (ABF-specific regions)</td>
    <td><span class="badge badge-gray">Low</span></td>
    <td>Medium — need boundary data + geo_areas entries</td>
  </tr>
  <tr>
    <td><strong>Social sharing (Facebook, X, LinkedIn)</strong></td>
    <td>Share buttons for social platforms</td>
    <td><span class="badge badge-gray">Low</span></td>
    <td>Small — add share buttons to SharePanel</td>
  </tr>
  <tr>
    <td><strong>Sankey diagram</strong></td>
    <td>Migration flow visualization between regions</td>
    <td><span class="badge badge-gray">Low</span></td>
    <td>Medium — d3-sankey or recharts-sankey</td>
  </tr>
  <tr>
    <td><strong>Urgente BAR-huishoudens / Leegstand metrics</strong></td>
    <td>Advanced housing demand variables (vacancy, starters vs leavers)</td>
    <td><span class="badge badge-yellow">Medium</span></td>
    <td>Medium — needs CBS data source identification</td>
  </tr>
  <tr>
    <td><strong>Prognose data (own forecasts)</strong></td>
    <td>ABF Primos-prognose 2025-2050 at gemeente level</td>
    <td><span class="badge badge-red">High</span></td>
    <td>TSA Engine Phase 1 PR pending — Phase 2 needed for full pipeline</td>
  </tr>
  <tr>
    <td><strong>Accessibility (ARIA, skip links, screen reader)</strong></td>
    <td>Full WCAG compliance with skip links, accessible table data</td>
    <td><span class="badge badge-yellow">Medium</span></td>
    <td>Medium — systematic ARIA audit needed</td>
  </tr>
  <tr>
    <td><strong>Video export (mp4)</strong></td>
    <td>Export period animation as video file</td>
    <td><span class="badge badge-gray">Low</span></td>
    <td>Large — canvas recording + ffmpeg</td>
  </tr>
  <tr>
    <td><strong>Draaitabel (pivot table) export</strong></td>
    <td>Excel pivot table format export</td>
    <td><span class="badge badge-gray">Low</span></td>
    <td>Small — xlsx pivot table support</td>
  </tr>
</table>

<h3>Recommended Priority Order</h3>
<ol>
  <li><strong>Merge TSA PR + Phase 2</strong> — Own forecasts are the #1 differentiator vs using CBS static data</li>
  <li><strong>Real choropleth map</strong> — Most visually impactful Primos feature we're missing. MapLibre GL + CBS WFS boundaries</li>
  <li><strong>Period animation</strong> — Quick win, TimelineSlider already exists</li>
  <li><strong>Kleurentabel + Klassenindeling</strong> — Color table + class editor combo is high-visibility</li>
  <li><strong>Urgente BAR / advanced housing metrics</strong> — Deepens our housing shortage analysis</li>
  <li><strong>Accessibility audit</strong> — Required for government/semi-government clients</li>
  <li><strong>Point map</strong> — After choropleth, trivial to add graduated symbols</li>
</ol>

<h3>Score Summary</h3>
<div class="section">
  <table>
    <tr><th>Category</th><th>Primos Features</th><th>We Have</th><th>Coverage</th></tr>
    <tr><td>Data variables</td><td>29</td><td>~24</td><td>83%</td></tr>
    <tr><td>Geographic levels</td><td>10</td><td>4</td><td>40%</td></tr>
    <tr><td>Presentation types</td><td>4 (table, color table, map, point map)</td><td>2 of 4 (missing real map + color table)</td><td>50%</td></tr>
    <tr><td>Chart types</td><td>11 loaded</td><td>20+</td><td>100%+</td></tr>
    <tr><td>Export formats</td><td>9</td><td>5</td><td>56%</td></tr>
    <tr><td>Data transformations</td><td>3</td><td>3</td><td>100%</td></tr>
    <tr><td>Sharing</td><td>5 channels</td><td>3 channels (URL, email, embed)</td><td>60%</td></tr>
    <tr><td>Forecasting</td><td>Primos-prognose (proprietary)</td><td>TSA Engine in PR (3 models + ensemble)</td><td>Phase 1 ready</td></tr>
  </table>
  <p><strong>Overall Primos feature coverage: ~70%</strong> — with chart variety and RBAC making up for gaps in maps and geo levels.</p>
</div>

<div class="meta">
  <p>Gegenereerd door Claude Code</p>
  <p>Repos: <a href="https://github.com/Schravenralph/Ruimtemeesters-Dashboarding">Dashboarding</a> | <a href="https://github.com/Schravenralph/Ruimtemeesters-TSA/pull/1">TSA PR #1</a></p>
</div>

</body>
</html>
`;

async function main() {
  console.log('[Report] Sending PR analysis + gap report...');
  const emailService = getEmailService();

  if (!emailService.isAvailable()) {
    console.error('[Report] SMTP not configured');
    console.log('[Report] Would send to:', RECIPIENT);
    // Print plain text summary
    console.log('\n=== PR STATUS ===');
    console.log('TSA PR #1: 5 review findings all resolved, 48 tests pass, ready to merge');
    console.log('\n=== PRIMOS GAP ===');
    console.log('Coverage: ~70% of Primos features');
    console.log('Top missing: Real choropleth map, own forecasts (TSA PR), period animation');
    process.exit(0);
  }

  await emailService.send({
    to: RECIPIENT,
    subject: `Ruimtemeesters — PR Analysis & Primos Gap Report (${new Date().toLocaleDateString('nl-NL')})`,
    html,
  });

  console.log(`[Report] Sent to ${RECIPIENT}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
