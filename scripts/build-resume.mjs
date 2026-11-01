// Prints resume/resume.html to public/nithesh-ramachandran-resume.pdf with headless Edge or Chrome.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.error('No Edge or Chrome found. Set CHROME_PATH to a Chromium-based browser.');
  process.exit(1);
}

const src = resolve('resume/resume.html');
const out = resolve('public/nithesh-ramachandran-resume.pdf');
// A throwaway profile keeps headless from attaching to an already-open browser window.
const profile = mkdtempSync(join(tmpdir(), 'resume-pdf-'));

try {
  execFileSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--allow-file-access-from-files',
      `--user-data-dir=${profile}`,
      '--no-pdf-header-footer',
      '--print-to-pdf-no-header',
      `--print-to-pdf=${out}`,
      pathToFileURL(src).href,
    ],
    { stdio: 'inherit' },
  );
} finally {
  rmSync(profile, { recursive: true, force: true });
}

console.log(`Wrote ${out}`);
