/**
 * Fixture shaped like the real Guardian Open Platform `/search` response.
 * Three results exercising: contributor tag present (author mapped),
 * no contributor tag (author null), missing fields (image + summary null).
 *
 * Real response shape:
 *   https://open-platform.theguardian.com/documentation/search
 */
export const guardianSearchResponse = {
  response: {
    status: 'ok',
    total: 3,
    results: [
      {
        id: 'environment/2026/aug/10/heat-dome-pacific-northwest',
        webTitle: 'Heat dome settles over Pacific Northwest for fifth day',
        webUrl: 'https://www.theguardian.com/environment/2026/aug/10/heat-dome-pacific-northwest',
        webPublicationDate: '2026-08-10T17:30:00Z',
        sectionName: 'Environment',
        fields: {
          trailText:
            'Temperature records continue to fall as the region enters an extended heat event.',
          thumbnail: 'https://i.guim.co.uk/img/media/heat-dome.jpg',
        },
        tags: [
          { webTitle: 'Oliver Milman', type: 'contributor' },
          { webTitle: 'Climate', type: 'keyword' },
        ],
      },
      {
        id: 'politics/2026/aug/11/budget-pension-triple-lock',
        webTitle: 'Treasury signals shift on pension triple lock',
        webUrl: 'https://www.theguardian.com/politics/2026/aug/11/budget-pension-triple-lock',
        webPublicationDate: '2026-08-11T08:15:00Z',
        sectionName: 'Politics',
        fields: {
          trailText: 'A review is expected before the autumn statement.',
        },
        tags: [
          { webTitle: 'Pensions', type: 'keyword' },
          { webTitle: 'UK news', type: 'keyword' },
        ],
      },
      {
        id: 'technology/2026/aug/11/fusion-startup-funding',
        webTitle: 'Fusion startup raises record Series C',
        webUrl: 'https://www.theguardian.com/technology/2026/aug/11/fusion-startup-funding',
        webPublicationDate: '2026-08-11T12:00:00Z',
        sectionName: 'Technology',
        tags: [],
      },
    ],
  },
};
