/**
 * npm run shot — headless-скриншоты игры для визуальной проверки.
 * Поднимает vite dev-сервер, открывает игру в chromium через playwright,
 * ждёт 4 с (игра успевает разогнаться при ?auto=gas) и кладёт PNG в ./shots/.
 *
 * Опции через env:
 *   SHOT_QUERY  — строка query, по умолчанию "auto=gas&seed=42"
 *   SHOT_NAME   — имя файла без расширения, по умолчанию из query + время
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const QUERY = process.env.SHOT_QUERY ?? 'auto=gas&seed=42';
const WAIT_MS = 4000;

const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port === 0 ? server.httpServer.address().port : server.config.server.port;
const url = `http://localhost:${port}/?${QUERY}`;

// В окружениях с предустановленным chromium (CI/облако) используем его,
// иначе playwright найдёт свой браузер сам. Переопределение: CHROMIUM_PATH.
const preinstalled = '/opt/pw-browsers/chromium';
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(preinstalled) ? preinstalled : undefined);
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(WAIT_MS);

  mkdirSync('shots', { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = process.env.SHOT_NAME ?? `shot_${stamp}`;
  const file = path.join('shots', `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`screenshot: ${file} (${url})`);

  if (errors.length > 0) {
    console.error('console errors:');
    for (const e of errors) console.error(`  ${e}`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  await server.close();
}
