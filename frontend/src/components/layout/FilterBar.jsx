import React from 'react';
import { CATEGORIES } from '../../utils/constants';
import { Filter, X } from 'lucide-react';

export function FilterBar({ 
  selectedCategory, 
  onCategoryChange, 
  radiusKm,
  onRadiusChange,
  showCategoryFilter,
  onToggleCategoryFilter,
  visible = true 
}) {
  if (!visible) {
    return (
      <button
        onClick={onToggleCategoryFilter}
        className="fixed top-20 left-4 z-30 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-md flex items-center gap-1 text-sm font-medium text-slate-700"
        data-testid="show-filter-btn"
      >
        <Filter className="w-4 h-4" />
        Filter
      </button>
    );
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-30 px-4 pt-2 pb-2 bg-white/95 backdrop-blur-sm border-b border-slate-100">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => onCategoryChange(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            !selectedCategory 
              ? 'bg-green-600 text-white' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          data-testid="filter-all"
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all capitalize ${
              selectedCategory === cat 
                ? 'bg-green-600 text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            data-testid={`filter-${cat}`}
          >
            {cat.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Radius Slider (optional) */}
      {onRadiusChange && (
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-slate-500">Radius:</span>
          <input
            type="range"
            min="1"
            max="100"
            value={radiusKm}
            onChange={(e) => onRadiusChange(parseInt(e.target.value))}
            className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <span className="text-xs font-medium text-green-600 min-w-[45px]">{radiusKm}km</span>
        </div>
      )}

      {/* Hide Filter Button */}
      <button
        onClick={onToggleCategoryFilter}
        className="absolute top-2 right-4 p-1 text-slate-400 hover:text-slate-600"
        data-testid="hide-filter-btn"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default FilterBar;
