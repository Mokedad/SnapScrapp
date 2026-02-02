import React from 'react';
import { Search, Menu, RefreshCw } from 'lucide-react';

export function Header({ 
  onMenuClick, 
  onSearchClick, 
  showSearchBar = false,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  isSearching = false
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 safe-area-inset-top">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-lime-500 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Ucycle
          </span>
        </div>

        {/* Search Bar (expanded) */}
        {showSearchBar ? (
          <form 
            onSubmit={(e) => { e.preventDefault(); onSearchSubmit?.(); }}
            className="flex-1 mx-4"
          >
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search 'Fridge', 'Copper', 'St Marys'..."
                className="w-full px-4 py-2 pl-10 bg-slate-100 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </form>
        ) : null}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!showSearchBar && (
            <button
              onClick={onSearchClick}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              data-testid="search-btn"
            >
              <Search className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <button
            onClick={onMenuClick}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            data-testid="menu-btn"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
