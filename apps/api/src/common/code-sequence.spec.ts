import { codeToSeq, seqToCode } from './code-sequence';

describe('seqToCode()', () => {
  describe('single-letter block (1..2600)', () => {
    it('maps 1 → A1', () => expect(seqToCode(1)).toBe('A1'));
    it('maps 2 → A2', () => expect(seqToCode(2)).toBe('A2'));
    it('maps 99 → A99', () => expect(seqToCode(99)).toBe('A99'));
    it('maps 100 → A100 (last code in block A)', () => expect(seqToCode(100)).toBe('A100'));
    it('maps 101 → B1 (first code in block B)', () => expect(seqToCode(101)).toBe('B1'));
    it('maps 200 → B100', () => expect(seqToCode(200)).toBe('B100'));
    it('maps 201 → C1', () => expect(seqToCode(201)).toBe('C1'));
    it('maps 2500 → Y100', () => expect(seqToCode(2500)).toBe('Y100'));
    it('maps 2501 → Z1', () => expect(seqToCode(2501)).toBe('Z1'));
    it('maps 2600 → Z100 (last code in single-letter block)', () =>
      expect(seqToCode(2600)).toBe('Z100'));
  });

  describe('two-letter overflow block (2601..70200)', () => {
    it('maps 2601 → AA1 (first code with two-letter prefix)', () =>
      expect(seqToCode(2601)).toBe('AA1'));
    it('maps 2700 → AA100', () => expect(seqToCode(2700)).toBe('AA100'));
    it('maps 2701 → AB1', () => expect(seqToCode(2701)).toBe('AB1'));
    it('maps 2800 → AB100', () => expect(seqToCode(2800)).toBe('AB100'));
    it('maps 2801 → AC1', () => expect(seqToCode(2801)).toBe('AC1'));
    it('maps 5200 → AZ100', () => expect(seqToCode(5200)).toBe('AZ100'));
    it('maps 5201 → BA1', () => expect(seqToCode(5201)).toBe('BA1'));
    it('maps 70200 → ZZ100 (last code in two-letter block)', () =>
      expect(seqToCode(70200)).toBe('ZZ100'));
  });

  describe('three-letter overflow block (70201..1,827,800)', () => {
    it('maps 70201 → AAA1', () => expect(seqToCode(70201)).toBe('AAA1'));
    it('maps 70300 → AAA100', () => expect(seqToCode(70300)).toBe('AAA100'));
    it('maps 70301 → AAB1', () => expect(seqToCode(70301)).toBe('AAB1'));
    it('maps the last code in the three-letter block', () =>
      // 70200 + 26^3 * 100 = 70200 + 1,757,600 = 1,827,800
      expect(seqToCode(1_827_800)).toBe('ZZZ100'));
    it('maps the first code in the four-letter block', () =>
      expect(seqToCode(1_827_801)).toBe('AAAA1'));
  });

  describe('input validation', () => {
    it('throws on 0', () => expect(() => seqToCode(0)).toThrow(/positive integer/));
    it('throws on negative numbers', () => expect(() => seqToCode(-1)).toThrow(/positive integer/));
    it('throws on non-integers', () => expect(() => seqToCode(1.5)).toThrow(/positive integer/));
    it('throws on NaN', () => expect(() => seqToCode(Number.NaN)).toThrow(/positive integer/));
  });
});

describe('codeToSeq()', () => {
  it('round-trips A1', () => expect(codeToSeq('A1')).toBe(1));
  it('round-trips Z100', () => expect(codeToSeq('Z100')).toBe(2600));
  it('round-trips AA1', () => expect(codeToSeq('AA1')).toBe(2601));
  it('round-trips ZZ100', () => expect(codeToSeq('ZZ100')).toBe(70200));
  it('round-trips AAA1', () => expect(codeToSeq('AAA1')).toBe(70201));
  it('round-trips ZZZ100', () => expect(codeToSeq('ZZZ100')).toBe(1_827_800));

  describe('input validation', () => {
    it('rejects empty strings', () => expect(() => codeToSeq('')).toThrow());
    it('rejects lowercase', () => expect(() => codeToSeq('a1')).toThrow(/malformed/));
    it('rejects missing letters', () => expect(() => codeToSeq('1')).toThrow());
    it('rejects missing digits', () => expect(() => codeToSeq('A')).toThrow());
    it('rejects numeric overflow', () => expect(() => codeToSeq('A101')).toThrow(/1\.\.100/));
    it('rejects numeric zero', () => expect(() => codeToSeq('A0')).toThrow(/1\.\.100/));
    it('rejects non-string inputs', () =>
      expect(() => codeToSeq(123 as unknown as string)).toThrow());
  });
});

describe('seqToCode ↔ codeToSeq round-trip property', () => {
  // Sample widely across blocks: edges, mid-block, and overflow boundaries.
  const samples = [
    1, 50, 100, 101, 1_000, 2_500, 2_600, // single-letter
    2_601, 2_700, 2_701, 5_200, 5_201, 70_200, // two-letter
    70_201, 70_300, 70_301, 1_827_800, 1_827_801, // three- and four-letter
  ];

  it.each(samples)('round-trips seq %i', (seq) => {
    const code = seqToCode(seq);
    expect(codeToSeq(code)).toBe(seq);
  });

  it('produces unique codes for the first 5,000 sequence numbers', () => {
    const seen = new Set<string>();
    for (let i = 1; i <= 5_000; i++) {
      const code = seqToCode(i);
      expect(seen.has(code)).toBe(false);
      seen.add(code);
    }
    expect(seen.size).toBe(5_000);
  });
});
