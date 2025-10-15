import fetchDefinition from './fetchDefinition';

describe('fetchDefinition', () => {
  const originalFetch = global.fetch as unknown as (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;

  afterEach(() => {
    global.fetch = originalFetch as unknown as typeof fetch;
    jest.resetAllMocks();
  });

  it('returns null on non-OK response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const result = await fetchDefinition('test');
    expect(result).toBeNull();
  });

  it('maps minimal successful response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          source: { url: 'https://freedictionaryapi.com' },
          entries: [
            {
              partOfSpeech: 'noun',
              pronunciations: [{ text: '/tɛst/' }],
              senses: [{ definition: 'an examination' }],
            },
          ],
        }),
    });

    const result = await fetchDefinition('test');
    expect(result).toEqual({
      definition: 'an examination',
      partOfSpeech: 'noun',
      pronunciation: '/tɛst/',
      source: 'https://freedictionaryapi.com',
    });
  });

  it('handles missing nested fields gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await fetchDefinition('test');
    expect(result).toEqual({
      definition: '',
      partOfSpeech: '',
      pronunciation: '',
      source: '',
    });
  });
});
