// Category mapping between UI display names and provider-specific values

type UICategory = 
  | 'Politics' 
  | 'Business' 
  | 'Technology' 
  | 'Science' 
  | 'Health' 
  | 'Sports' 
  | 'Entertainment';

// const UI_CATEGORIES: UICategory[] = [
//   'Politics',
//   'Business',
//   'Technology',
//   'Science',
//   'Health',
//   'Sports',
//   'Entertainment',
// ];

// Guardian API section names (lowercase)
const GUARDIAN_CATEGORY_MAP: Record<UICategory, string> = {
  Politics: 'politics',
  Business: 'business',
  Technology: 'technology',
  Science: 'science',
  Health: 'health',
  Sports: 'sport',  // Guardian uses 'sport' not 'sports'
  Entertainment: 'culture',  // Guardian uses 'culture' for entertainment
};

// NYT API news_desk values (case-sensitive, matches UI mostly)
const NYT_CATEGORY_MAP: Record<UICategory, string> = {
  Politics: 'Politics',
  Business: 'Business',
  Technology: 'Technology',
  Science: 'Science',
  Health: 'Health',
  Sports: 'Sports',
  Entertainment: 'Arts',  // NYT uses 'Arts' for entertainment
};

// NewsAPI category values (lowercase)
const NEWSAPI_CATEGORY_MAP: Record<UICategory, string> = {
  Politics: 'general',  // NewsAPI doesn't have politics, use general
  Business: 'business',
  Technology: 'technology',
  Science: 'science',
  Health: 'health',
  Sports: 'sports',
  Entertainment: 'entertainment',
};

export function mapCategoryForProvider(
  uiCategory: UICategory | string,
  providerId: 'newsapi' | 'guardian' | 'nyt'
): string | undefined {
  const category = uiCategory as UICategory;
  
  switch (providerId) {
    case 'guardian':
      return GUARDIAN_CATEGORY_MAP[category];
    case 'nyt':
      return NYT_CATEGORY_MAP[category];
    case 'newsapi':
      return NEWSAPI_CATEGORY_MAP[category];
    default:
      return undefined;
  }
}