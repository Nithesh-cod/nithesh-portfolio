/* Text handling for JARVIS's built-in AI: language detection (ported from the
 * mini_jarvis assistant), tokens, and the hashed features its classifier reads.
 * The trainer imports this same file, so training and serving always match. */

export type Lang = 'en' | 'ta';

const TAMIL_CHAR = /[஀-௿]/;

// Romanised Tamil words that rarely appear in English sentences.
const TANGLISH = new Set(
  `enna ena ennachu enga eppo epdi eppadi yen edhuku ethuku ethana ethanai yaru yaaru
   pannu pannunga panni pannuga panna pannirukkaru pannirukan pannirukaru panniruka sollu sollunga solu sonna solren
   irukku iruku irukka irukkaa irukkaru irukaru illa illai illaya venum venam vendam vendaam
   naalaikku nalaikku innaikku inniki neram konjam romba nalla paaru kelu
   pesu pesunga thirumba marupadi vegama medhuva
   unga enaku enakku neenga naan namma vanakkam theriyuma therinjikka therinja
   velai padikkiraru padikiraru padichirukkaru padichirukaru padikkaru mudichirukkaru mudichirukaru ponga poda vaanga
   thalaiva nanba machan machi kaattu kaatu kattu kaatunga thirakka thira thiranga pathi patthi evlo evalo
   project la skill sollunga anupu anuppu anuppunga anupunga kudunga kudu kodu kodunga kaatungo pesalama pesuveengala
   ippo ippa thaan dhaan aana appo avar avaru avara avarukku ivar`
    .split(/\s+/)
    .filter((w) => w !== 'la' && w !== 'project' && w !== 'skill'),
);

export const hasTamil = (text: string) => TAMIL_CHAR.test(text);

/** Lower-case, drop punctuation (keeping Tamil letters and vowel signs), collapse spaces. */
export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();
}

export const words = (text: string) => normalize(text).split(' ').filter(Boolean);

export function detectLanguage(text: string): Lang {
  if (hasTamil(text)) return 'ta';
  return words(text).some((w) => TANGLISH.has(w)) ? 'ta' : 'en';
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Word, word-pair and character n-gram features, hashed with a sign, L2-normalised.
 *  Character n-grams are what make it tolerate typos and Tanglish spelling. */
export function features(text: string, dims: number): Map<number, number> {
  const ws = words(text);
  const grams: string[] = [];
  ws.forEach((w, i) => {
    grams.push(`w:${w}`);
    const next = ws[i + 1];
    if (next) grams.push(`b:${w}_${next}`);
    const padded = `^${w}$`;
    for (const n of [3, 4]) {
      for (let p = 0; p + n <= padded.length; p++) grams.push(`c:${padded.slice(p, p + n)}`);
    }
  });
  const counts = new Map<number, number>();
  for (const gram of grams) {
    const h = hash(gram);
    const index = h % dims;
    const sign = h & 0x80000000 ? -1 : 1;
    counts.set(index, (counts.get(index) ?? 0) + sign);
  }
  let norm = 0;
  for (const [i, v] of counts) {
    const damped = Math.sign(v) * Math.log1p(Math.abs(v));
    counts.set(i, damped);
    norm += damped * damped;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [i, v] of counts) counts.set(i, v / norm);
  return counts;
}

/** Edit distance, capped: returns max + 1 as soon as it can't be within `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const value = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
      row.push(value);
      if (value < best) best = value;
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length] ?? max + 1;
}
