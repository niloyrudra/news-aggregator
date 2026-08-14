import { XCircleIcon } from "lucide-react";

export const CloseButton = ({onClick}: { onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="ml-4 flex-shrink-0 text-yellow-400 hover:text-yellow-600 focus:outline-none"
        aria-label="Dismiss notice"
    >
        <XCircleIcon className="h-5 w-5" />
    </button>
);
