import { dedupeLinks } from './dedupeLinks';

describe('dedupeLinks', () => {
  it('returns empty array when given empty associations', () => {
    const result = dedupeLinks([]);
    expect(result).toEqual([]);
  });

  it('returns empty array when given undefined', () => {
    const result = dedupeLinks();
    expect(result).toEqual([]);
  });

  it('transforms single association type with single word', () => {
    const associations = [
      {
        associationType: 'rel_syn',
        matches: [{ word: 'happy', score: 100 }],
      },
    ];

    const result = dedupeLinks(associations);

    expect(result).toEqual([
      {
        name: 'happy',
        associations: [{ type: 'rel_syn', score: 100 }],
      },
    ]);
  });

  it('transforms single association type with multiple words', () => {
    const associations = [
      {
        associationType: 'rel_syn',
        matches: [
          { word: 'happy', score: 100 },
          { word: 'joyful', score: 95 },
        ],
      },
    ];

    const result = dedupeLinks(associations);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      name: 'happy',
      associations: [{ type: 'rel_syn', score: 100 }],
    });
    expect(result).toContainEqual({
      name: 'joyful',
      associations: [{ type: 'rel_syn', score: 95 }],
    });
  });

  it('deduplicates words across multiple association types', () => {
    const associations = [
      {
        associationType: 'rel_syn',
        matches: [{ word: 'happy', score: 100 }],
      },
      {
        associationType: 'rel_trg',
        matches: [{ word: 'happy', score: 85 }],
      },
    ];

    const result = dedupeLinks(associations);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'happy',
      associations: [
        { type: 'rel_syn', score: 100 },
        { type: 'rel_trg', score: 85 },
      ],
    });
  });

  it('keeps all associations when same word appears with same association type', () => {
    const associations = [
      {
        associationType: 'rel_syn',
        matches: [{ word: 'happy', score: 100 }],
      },
      {
        associationType: 'rel_syn',
        matches: [{ word: 'happy', score: 120 }],
      },
    ];

    const result = dedupeLinks(associations);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'happy',
      associations: [
        { type: 'rel_syn', score: 100 },
        { type: 'rel_syn', score: 120 },
      ],
    });
  });

  it('handles complex scenario with multiple words and association types', () => {
    const associations = [
      {
        associationType: 'rel_syn',
        matches: [
          { word: 'happy', score: 100 },
          { word: 'joyful', score: 95 },
        ],
      },
      {
        associationType: 'rel_ant',
        matches: [
          { word: 'sad', score: 90 },
          { word: 'happy', score: 85 }, // duplicate word, different type
        ],
      },
      {
        associationType: 'rel_trg',
        matches: [
          { word: 'smile', score: 80 },
          { word: 'joyful', score: 75 }, // duplicate word, different type
        ],
      },
    ];

    const result = dedupeLinks(associations);

    expect(result).toHaveLength(4);

    const happyLink = result.find((link) => link.name === 'happy');
    expect(happyLink).toEqual({
      name: 'happy',
      associations: [
        { type: 'rel_syn', score: 100 },
        { type: 'rel_ant', score: 85 },
      ],
    });

    const joyfulLink = result.find((link) => link.name === 'joyful');
    expect(joyfulLink).toEqual({
      name: 'joyful',
      associations: [
        { type: 'rel_syn', score: 95 },
        { type: 'rel_trg', score: 75 },
      ],
    });
  });
});
