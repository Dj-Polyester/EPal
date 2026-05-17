import { X, User } from 'lucide-react';

interface CharacterDetailModalProps {
  open: boolean;
  onClose: () => void;
  name: string;
  avatarUrl: string | null;
  personality: string | null;
}

export default function CharacterDetailModal({
  open,
  onClose,
  name,
  avatarUrl,
  personality,
}: CharacterDetailModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image */}
        <div className="relative h-64 bg-indigo-100">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-indigo-300">
              <User className="w-24 h-24" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{name}</h2>
          <div className="h-px bg-gray-200 mb-4" />
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            About
          </h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {personality || 'No description available.'}
          </p>
        </div>
      </div>
    </div>
  );
}
