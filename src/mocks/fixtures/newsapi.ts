/**
 * Fixture shaped like the real NewsAPI `/v2/everything` and `/v2/top-headlines`
 * response. Two articles, exercising the mapping rules: present author,
 * missing author, present image, missing image.
 *
 * Field shape is taken from https://newsapi.org/docs/endpoints/everything —
 * keep this in sync if the vendor adds fields.
 */
export const newsApiArticlesResponse = {
  status: 'ok',
  totalResults: 2,
  articles: [
    {
      source: { id: 'the-washington-post', name: 'The Washington Post' },
      author: 'Carolyn Y. Johnson',
      title: 'A new study changes what we know about statins',
      description:
        'Researchers report a previously unknown effect of the widely prescribed cholesterol drugs.',
      url: 'https://www.washingtonpost.com/health/2026/08/10/statins-study/',
      urlToImage:
        'https://www.washingtonpost.com/wp-statins-study/wp-content/uploads/sites/2/2026/08/GettyImages-statins.jpg',
      publishedAt: '2026-08-10T13:04:15Z',
      content: 'A previously unknown effect… [+3120 chars]',
    },
    {
      source: { id: null, name: 'TechCrunch' },
      author: null,
      title: 'Open-source AI tool lands Series A',
      description: 'The startup raised $40M to expand the maintainer team.',
      url: 'https://techcrunch.com/2026/08/11/open-source-ai-series-a/',
      urlToImage: null,
      publishedAt: '2026-08-11T09:00:00Z',
      content: 'The funding round… [+1820 chars]',
    },
  ],
};
