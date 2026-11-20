import { validateTournamentDraft } from './create-tournament.component';

describe('validateTournamentDraft', () => {
  const validDraft = {
    name: 'Pratapnagar Premier League',
    format: 'T20',
    overs: 20,
    startDate: '2026-12-15',
  };

  it('accepts a valid tournament draft', () => {
    expect(validateTournamentDraft(validDraft)).toEqual({});
  });

  it('rejects blank and too-short tournament names', () => {
    expect(validateTournamentDraft({ ...validDraft, name: '  ' }).name).toBeTruthy();
    expect(validateTournamentDraft({ ...validDraft, name: 'PL' }).name).toContain('3 characters');
  });

  it('rejects unsupported formats', () => {
    expect(validateTournamentDraft({ ...validDraft, format: 'T100' }).format).toBeTruthy();
  });

  it('requires overs to be an integer from 1 to 100', () => {
    for (const overs of [0, -1, 1.5, 101, Number.NaN]) {
      expect(validateTournamentDraft({ ...validDraft, overs }).overs).toBeTruthy();
    }
    expect(validateTournamentDraft({ ...validDraft, overs: 1 }).overs).toBeUndefined();
    expect(validateTournamentDraft({ ...validDraft, overs: 100 }).overs).toBeUndefined();
  });

  it('accepts an optional date but rejects malformed or impossible dates', () => {
    expect(validateTournamentDraft({ ...validDraft, startDate: '' }).startDate).toBeUndefined();
    expect(
      validateTournamentDraft({ ...validDraft, startDate: '15-12-2026' }).startDate,
    ).toBeTruthy();
    expect(
      validateTournamentDraft({ ...validDraft, startDate: '2026-02-30' }).startDate,
    ).toBeTruthy();
  });
});
