import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';

const dir = './temporary screenshots';
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const files = existsSync(dir) ? readdirSync(dir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png')) : [];
const nums = files.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(n => !isNaN(n));
const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;

const outPath = join(dir, `screenshot-${next}${label}.png`);

const script = `
const { execSync } = require('child_process');
const puppeteer = (() => { try { return require('puppeteer'); } catch(e) { return null; } })();
if (!puppeteer) { console.error('no puppeteer'); process.exit(1); }
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('${url}', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ path: '${outPath}', fullPage: true });
  await browser.close();
  console.log('Saved: ${outPath}');
})();
`;

try {
  execSync(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
} catch(e) {
  // Try with npx puppeteer
  const jsFile = `/tmp/screenshot_${Date.now()}.js`;
  import('fs').then(({ writeFileSync }) => {
    writeFileSync(jsFile, `
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('${url}', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '${outPath}', fullPage: true });
  await browser.close();
  console.log('Saved: ${outPath}');
})();
`);
    execSync(`node ${jsFile}`, { stdio: 'inherit' });
  });
}
