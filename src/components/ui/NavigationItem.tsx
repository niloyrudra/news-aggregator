import { Link } from 'react-router-dom';

interface NavigationItemProps {
  link: string;
  label: string;
  icon?: React.ReactElement;
  isActive?: boolean;
  hideLabelOnMobile?: boolean;
}

export const NavigationItem = ({ link, label, icon, isActive = false, hideLabelOnMobile = false }: NavigationItemProps) => (
  <Link
    to={link}
    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700 border border-blue-200'
        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
    }`}
  >
    <span className="flex items-center gap-1.5">
      {icon}
      <span className={hideLabelOnMobile ? 'hidden sm:inline' : ''}>{label}</span>
    </span>
  </Link>
);
