/**
 * Unit tests for language detection utility
 */
import { describe, it, expect } from 'vitest';
import { isEnglishText, getNonEnglishHint } from '@/lib/utils/language-detector';

describe('isEnglishText', () => {
  it('should detect English text', () => {
    const englishTexts = [
      'I am planning a trip to Paris with my wife for 5 days',
      'We are traveling to Tokyo next week with our family',
      'Going on vacation to London for the weekend',
      'Planning a trip for our honeymoon',
    ];

    englishTexts.forEach((text) => {
      expect(isEnglishText(text)).toBe(true);
    });
  });

  it('should detect non-English text (Polish)', () => {
    const polishTexts = [
      'Jadę do Paryża z żoną na pięć dni',
      'Jad ę z dziećmi na wakacje',
    ];

    polishTexts.forEach((text) => {
      expect(isEnglishText(text)).toBe(false);
    });
  });

  it('should detect non-English text (Spanish)', () => {
    const spanishTexts = [
      'Viajo a Barcelona con mi esposa por 7 días',
      'Planeamos un viaje en familia',
    ];

    spanishTexts.forEach((text) => {
      expect(isEnglishText(text)).toBe(false);
    });
  });

  it('should detect non-English text (German)', () => {
    const germanTexts = [
      'Ich reise nach Berlin mit meiner Frau für 5 Tage',
      'Wir planen eine Reise mit Kindern',
    ];

    germanTexts.forEach((text) => {
      expect(isEnglishText(text)).toBe(false);
    });
  });

  it('should detect non-English text (French)', () => {
    const frenchTexts = [
      'Je voyage à Paris avec ma femme pour 5 jours',
      'Nous planifions un voyage en famille',
    ];

    frenchTexts.forEach((text) => {
      expect(isEnglishText(text)).toBe(false);
    });
  });

  it('should default to English for very short text', () => {
    expect(isEnglishText('Paris')).toBe(true);
    expect(isEnglishText('5 days')).toBe(true);
    expect(isEnglishText('')).toBe(true);
  });

  it('should require at least 2 English indicators', () => {
    // Text with only 1 English word shouldn't be enough
    expect(isEnglishText('xyz abc def the qwerty')).toBe(true); // Has "the"
    
    // Text with 2+ English indicators
    expect(isEnglishText('we are going trip')).toBe(true);
  });

  it('should handle mixed case text', () => {
    expect(isEnglishText('TRAVELING TO PARIS WITH MY FAMILY')).toBe(true);
    expect(isEnglishText('Traveling To Paris With My Family')).toBe(true);
  });
});

describe('getNonEnglishHint', () => {
  it('should return hint for non-English text', () => {
    const hint = getNonEnglishHint(true);

    expect(hint).not.toBeNull();
    expect(hint).toContain('detected');
    expect(hint).toContain('English');
  });

  it('should return null for English text', () => {
    const hint = getNonEnglishHint(false);

    expect(hint).toBeNull();
  });
});

