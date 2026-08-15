import type { Article } from '@/contracts/Article';
import { Badge } from '@/components/ui/Badge';

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {article.imageUrl && (
        <img
          src={article.imageUrl}
          alt={article.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      )}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight">
            {article.title}
          </h3>
        </div>
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">
          {article.summary}
        </p>
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge>{article.source}</Badge>
            {article.category && <Badge variant="gray">{article.category}</Badge>}
          </div>
          <time dateTime={article.publishedAt} className="text-xs text-gray-500">
            {new Date(article.publishedAt).toLocaleDateString()}
          </time>
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Read more
          <svg
            className="ml-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            ></path>
          </svg>
        </a>
      </div>
    </article>
  );
}