/**
 * Fixture shaped like the real NYT Article Search API v2 response.
 * Three results exercising: full byline, byline without "By ", missing
 * byline, present + missing abstract, present + missing image, multiple
 * section_name values.
 *
 * Real response shape:
 *   https://developer.nytimes.com/docs/articlesearch-product/1/overview
 */
export const nytArticleSearchResponse = {
  status: 'OK',
  response: {
    docs: [
      {
        _id: 'nyt://article/abc-123-def-456',
        web_url: 'https://www.nytimes.com/2026/08/10/world/economy/global-supply-chain.html',
        snippet:
          'A worldwide slowdown in shipping has begun to ripple through retail inventories.',
        lead_paragraph:
          'Port operators from Long Beach to Rotterdam are reporting record backlogs.',
        abstract:
          'A worldwide slowdown in shipping has begun to ripple through retail inventories, raising the prospect of shortages ahead of the holiday season.',
        print_page: 'B1',
        blog: {},
        source: 'The New York Times',
        multimedia: [
          {
            rank: 1,
            subtype: 'xlarge',
            type: 'image',
            url: 'images/2026/08/10/world/10supply-1/10supply-1-articleLarge.jpg',
          },
          {
            rank: 2,
            subtype: 'wide',
            type: 'image',
            url: 'images/2026/08/10/world/10supply-1/10supply-1-thumbWide.jpg',
          },
        ],
        headline: {
          main: 'Global Supply Chain Slowdown Reaches Retail Shelves',
          kicker: 'Trade',
          content_kicker: null,
          print_headline: 'A Supply Slowdown Reaches the Shelves',
          name: null,
          seo: null,
          sub: null,
        },
        keywords: [
          { name: 'subject', value: 'Supply Chain' },
          { name: 'subject', value: 'Global Trade' },
          { name: 'glocations', value: 'Rotterdam' },
        ],
        pub_date: '2026-08-10T14:00:09+0000',
        document_type: 'article',
        news_desk: 'Business',
        section_name: 'Business',
        subsection_name: 'Economy',
        byline: {
          original: 'By Ana Swanson and Jordyn Holman',
          person: [
            { firstname: 'Ana', middlename: null, lastname: 'Swanson' },
            { firstname: 'Jordyn', middlename: null, lastname: 'Holman' },
          ],
          organization: null,
        },
        type_of_material: 'News',
        word_count: 1180,
      },
      {
        _id: 'nyt://article/ghi-789-jkl-012',
        web_url: 'https://www.nytimes.com/2026/08/11/opinion/ai-regulation-eu.html',
        snippet: 'Brussels is preparing a new wave of regulation targeting foundation models.',
        lead_paragraph: 'The draft directive could reshape how the largest systems are deployed.',
        abstract: null, // opinion pieces often lack an abstract
        multimedia: [], // no images
        headline: {
          main: 'Europe Is Quietly Winning the AI Regulation Race',
          kicker: 'Opinion',
          print_headline: 'Europe Quietly Wins the AI Race',
        },
        keywords: [
          { name: 'subject', value: 'Artificial Intelligence' },
          { name: 'subject', value: 'Regulation' },
        ],
        pub_date: '2026-08-11T09:30:00+0000',
        document_type: 'article',
        news_desk: 'OpEd',
        section_name: 'Opinion',
        subsection_name: null,
        // Editorial page opinion piece — no byline at all.
        byline: { original: null, person: [], organization: null },
        type_of_material: 'Op-Ed',
        word_count: 820,
      },
      {
        _id: 'nyt://article/mno-345-pqr-678',
        web_url: 'https://www.nytimes.com/2026/08/11/sports/baseball/yankees-trade-deadline.html',
        snippet: 'With hours to go before the deadline, the Yankees made a bold move.',
        lead_paragraph: 'The team parted with two prospects to acquire a frontline starter.',
        abstract: 'With hours to go before the deadline, the Yankees made a bold move.',
        multimedia: [
          {
            rank: 1,
            subtype: 'xlarge',
            type: 'image',
            url: 'images/2026/08/11/sports/11yankees/11yankees-articleLarge.jpg',
          },
        ],
        headline: {
          main: 'Yankees Swing for a Frontline Starter at the Deadline',
          kicker: 'MLB',
          print_headline: 'Yankees Swing Big at the Deadline',
        },
        keywords: [],
        pub_date: '2026-08-11T20:15:00+0000',
        document_type: 'article',
        news_desk: 'Sports',
        section_name: 'Sports',
        subsection_name: 'Baseball',
        byline: {
          // Already-trimmed byline — some APIs/data feeds return the name
          // without a "By " prefix. Provider should not double-strip.
          original: 'James Wagner',
          person: [{ firstname: 'James', middlename: null, lastname: 'Wagner' }],
          organization: null,
        },
        type_of_material: 'News',
        word_count: 640,
      },
    ],
  },
};
