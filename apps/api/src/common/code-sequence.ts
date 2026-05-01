/**
 * Project / company code allocation helpers (Package C).
 *
 * The code sequence is structured as repeating blocks of (letter-prefix × 1..100)
 * pairs, expanding the prefix length when each block runs out:
 *
 *   1..2600        → A1..Z100        (26 letters × 100 numbers, single-letter prefix)
 *   2601..70200    → AA1..ZZ100      (676 prefixes × 100 numbers, two-letter prefix)
 *   70201..1827800 → AAA1..ZZZ100    (17576 prefixes × 100 numbers, three-letter prefix)
 *   ...continues indefinitely...
 *
 * Used in two places:
 *   - `companyCode` on the Tenant (drawn from a global counter at registration)
 *   - The numeric/letter portion of project codes (drawn from per-tenant `nextProjectSeq`)
 *
 * The full project code is the concatenation: `${tenant.companyCode}${seqToCode(projSeq)}`.
 * For tenant `A1`'s 23rd project that yields `A1A23`, exactly per the spec.
 */

const BASE = 26;
const NUMERIC_BUCKET = 100;

/**
 * Convert a 1-based monotonic sequence number into its alphanumeric code.
 *
 * Throws if `seq` is not a positive integer. There's no upper bound: the
 * algorithm keeps growing the letter-prefix as needed.
 */
export function seqToCode(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`seqToCode: expected a positive integer, received ${seq}`);
  }
  // Work in zero-indexed space, peeling off completed prefix-length blocks
  // until we land in the block that contains `seq`.
  let remaining = seq - 1;
  let prefixLen = 1;
  let blockSize = BASE * NUMERIC_BUCKET; // 26 * 100 = 2600 for length 1
  while (remaining >= blockSize) {
    remaining -= blockSize;
    prefixLen += 1;
    blockSize = Math.pow(BASE, prefixLen) * NUMERIC_BUCKET;
  }
  const letterIdx = Math.floor(remaining / NUMERIC_BUCKET);
  const numericPart = (remaining % NUMERIC_BUCKET) + 1;
  return `${letterIdxToString(letterIdx, prefixLen)}${numericPart}`;
}

/**
 * Inverse of `seqToCode`. Round-trips for any input emitted by `seqToCode`.
 *
 * Throws on malformed codes (lowercase, missing prefix, numeric > 100, etc.).
 * Used by the C4 backfill migration to verify existing codes resolve to a
 * known sequence number.
 */
export function codeToSeq(code: string): number {
  if (typeof code !== 'string' || code.length < 2) {
    throw new Error(`codeToSeq: expected a string of length ≥ 2, received "${code}"`);
  }
  const match = /^([A-Z]+)(\d+)$/.exec(code);
  if (!match) {
    throw new Error(`codeToSeq: malformed code "${code}" — expected /^[A-Z]+\\d+$/`);
  }
  const letters = match[1];
  const numericPart = Number(match[2]);
  if (!Number.isInteger(numericPart) || numericPart < 1 || numericPart > NUMERIC_BUCKET) {
    throw new Error(
      `codeToSeq: numeric part of "${code}" must be in 1..${NUMERIC_BUCKET}, got ${numericPart}`,
    );
  }
  const prefixLen = letters.length;
  // Convert prefix to base-26 index (A=0, B=1, ..., Z=25, AA=26, ...).
  let letterIdx = 0;
  for (let i = 0; i < prefixLen; i++) {
    letterIdx = letterIdx * BASE + (letters.charCodeAt(i) - 65);
  }
  // Add the cumulative size of all shorter-prefix blocks.
  let offset = 0;
  for (let L = 1; L < prefixLen; L++) {
    offset += Math.pow(BASE, L) * NUMERIC_BUCKET;
  }
  return offset + letterIdx * NUMERIC_BUCKET + (numericPart - 1) + 1;
}

/**
 * Convert a 0-indexed letter index into a fixed-length uppercase prefix using
 * base-26 (e.g. {idx=0,len=2}→"AA", {idx=1,len=2}→"AB", {idx=27,len=2}→"BB").
 */
function letterIdxToString(letterIdx: number, prefixLen: number): string {
  let idx = letterIdx;
  let out = '';
  for (let i = 0; i < prefixLen; i++) {
    out = String.fromCharCode(65 + (idx % BASE)) + out;
    idx = Math.floor(idx / BASE);
  }
  return out;
}
