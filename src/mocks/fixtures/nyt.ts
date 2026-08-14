/**
 * Fixture shaped like the real NYT Article Search API `/articlesearch.json`
 * response. Three docs exercising: full article (byline + image + both date
 * fields), missing byline (author null), missing multimedia (image null).
 *
 * Real response shape (verified live 2026-08-14):
 *   - `multimedia` is an OBJECT with `default`/`thumbnail` keys, NOT an array
 *   - `multimedia.default.url` / `multimedia.thumbnail.url` are ABSOLUTE URLs
 *     (`https://static01.nyt.com/...`), not path-only strings
 *   - `lead_paragraph` is NOT present in real responses — only `abstract`
 *
 * Reference:
 *   https://developer.nytimes.com/docs/articlesearch-product/1/routes/articlesearch.json/get
 */
export const nytArticlesResponse = {
  status: 'OK',
  response: {
    docs: [
      {
        _id: 'nyt://article/2026-08-11T12:30:00Z/climate-summit-2026',
        headline: {
          main: 'Climate summit closes with surprise methane pledge',
          print_headline: 'Surprise Methane Pledge Caps Climate Summit',
        },
        abstract:
          'Forty nations signed a nonbinding agreement to slash methane emissions faster than planned.',
        web_url:
          'https://www.nytimes.com/2026/08/11/world/climate/climate-summit-2026.html',
        pub_date: '2026-08-11T12:30:00Z',
        news_desk: 'Climate',
        section_name: 'World',
        byline: {
          original: 'By Lisa Friedman and Max Bearak',
        },
        multimedia: {
          caption: 'Delegates at the climate summit in Geneva.',
          credit: 'Jean-Pierre Clatot/Agence France-Presse',
          default: {
            url: 'https://static01.nyt.com/images/2026/08/11/climate-summit/merlin-123456-default.jpg',
            height: 400,
            width: 600,
          },
          thumbnail: {
            url: 'https://static01.nyt.com/images/2026/08/11/climate-summit/merlin-123456-thumbStandard.jpg',
            height: 75,
            width: 75,
          },
        },
      },
      {
        _id: 'nyt://article/2026-08-12T08:00:00Z/fed-rate-decision',
        headline: {
          main: 'Fed signals a pause as inflation cools',
        },
        abstract:
          'Policymakers held rates steady and hinted at the end of the tightening cycle.',
        web_url:
          'https://www.nytimes.com/2026/08/12/business/fed-rate-decision.html',
        pub_date: '2026-08-12T08:00:00Z',
        news_desk: 'Business',
        section_name: 'Business',
        // No byline — anonymous wire story.
        multimedia: {
          caption: 'The Federal Reserve building in Washington.',
          credit: 'Al Drago/Bloomberg',
          default: {
            url: 'https://static01.nyt.com/images/2026/08/12/fed/merlin-789-default.jpg',
            height: 400,
            width: 600,
          },
          thumbnail: {
            url: 'https://static01.nyt.com/images/2026/08/12/fed/thumb-789.jpg',
            height: 75,
            width: 75,
          },
        },
      },
      {
        _id: 'nyt://article/2026-08-12T15:45:00Z/op-ed-ai-policy',
        headline: {
          main: 'Opinion: AI policy needs less theater, more substance',
        },
        abstract:
          'A short abstract is enough — the article did not include a lead_paragraph either.',
        web_url:
          'https://www.nytimes.com/2026/08/12/opinion/ai-policy.html',
        pub_date: '2026-08-12T15:45:00Z',
        news_desk: 'Opinion',
        section_name: 'Opinion',
        byline: {
          original: 'By Ezra Klein',
        },
        // No multimedia at all — imageUrl must come out null.
      },
    ],
  },
};