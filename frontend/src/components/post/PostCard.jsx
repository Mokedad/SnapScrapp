import React from 'react';
import { formatDistance } from '../../utils/mapUtils';
import { Heart, Clock } from 'lucide-react';

// Category badge component
export function CategoryBadge({ category }) {
  return (
    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full capitalize">
      {category?.replace('-', ' ')}
    </span>
  );
}

// Status badge component
export function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    collected: 'bg-slate-100 text-slate-600',
    expired: 'bg-red-100 text-red-800'
  };
  
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}

// Post card component for list views
export function PostCard({ post, onViewDetails, isFavorite, onToggleFavorite }) {
  const distance = post.distance !== undefined ? formatDistance(post.distance) : null;
  
  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onViewDetails(post)}
      data-testid={`post-card-${post.id}`}
    >
      <div className="relative">
        <img 
          src={post.image_base64?.startsWith('data:') ? post.image_base64 : `data:image/jpeg;base64,${post.image_base64}`}
          alt={post.title}
          className="w-full h-40 object-cover"
        />
        <div className="absolute top-2 left-2">
          <CategoryBadge category={post.category} />
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          {post.status === 'active' && (
            <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Active
            </span>
          )}
        </div>
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(post.id); }}
            className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
            data-testid={`favorite-btn-${post.id}`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
          </button>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{post.title}</h3>
        <p className="text-slate-500 text-xs line-clamp-2 mt-1">{post.description}</p>
        <div className="flex items-center justify-between mt-2">
          {distance && (
            <span className="text-xs text-green-600 font-medium">{distance} away</span>
          )}
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <Clock className="w-3 h-3" />
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostCard;
