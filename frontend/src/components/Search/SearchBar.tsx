import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, QrCode, Building, ArrowRight } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { Location, RecentSearchItem } from '../../types';
import api from '../../services/api';
import { useNavigation } from '../../context/NavigationContext';

const RECENT_SEARCHES_KEY = 'campus_nav_recent_searches';
const MAX_RECENT = 5;

interface SearchBarProps {
  onOpenScanner?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onOpenScanner }) => {
  const { setSelectedLocation, setIsScannerOpen } = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch search results on debounced query
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await api.locations.search(debouncedQuery.trim());
        setResults(data);
        setActiveIndex(-1);
      } catch (err) {
        console.error('Search query failed:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  // Save selected location to recents
  const saveRecent = useCallback((loc: Location) => {
    const item: RecentSearchItem = {
      id: loc.id,
      name: loc.name,
      categoryName: loc.category?.name || 'Campus Location',
      categoryColor: loc.category?.color || '#4F46E5',
      latitude: loc.latitude,
      longitude: loc.longitude,
    };

    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r.id !== loc.id);
      const updated = [item, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save recents to localStorage', err);
      }
      return updated;
    });
  }, []);

  const removeRecent = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearAllRecents = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  }, []);

  const handleSelectLocation = useCallback(
    (loc: Location) => {
      saveRecent(loc);
      setSelectedLocation(loc);
      setIsOpen(false);
      setQuery('');
    },
    [saveRecent, setSelectedLocation]
  );

  const handleSelectRecent = useCallback(
    async (item: RecentSearchItem) => {
      try {
        const fullLoc = await api.locations.getById(item.id);
        setSelectedLocation(fullLoc);
      } catch {
        setSelectedLocation({
          id: item.id,
          name: item.name,
          category_id: 0,
          latitude: item.latitude,
          longitude: item.longitude,
          facilities: [],
          opening_hours: null,
          photo_url: null,
          description: null,
          department: null,
          entrance_node_id: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      setIsOpen(false);
      setQuery('');
    },
    [setSelectedLocation]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelectLocation(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Substring highlight helper
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="font-bold text-brand-indigo dark:text-brand-teal">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto z-40">
      {/* Search Bar Input Container */}
      <div className="relative flex items-center glass-panel shadow-floating px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 transition-all focus-within:ring-2 focus-within:ring-brand-indigo/50">
        <Search className="text-slate-400 dark:text-slate-500 ml-1 shrink-0" size={20} />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search buildings, labs, departments..."
          className="w-full bg-transparent px-3 py-1.5 text-sm md:text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
        />

        {/* Clear query button */}
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors mr-1"
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}

        {/* QR Scanner Modal trigger button */}
        <button
          onClick={() => {
            if (onOpenScanner) onOpenScanner();
            else setIsScannerOpen(true);
          }}
          className="p-2 text-brand-indigo dark:text-brand-teal hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 shrink-0"
          title="Scan QR Code at Campus Location"
          aria-label="Scan Campus QR Code"
        >
          <QrCode size={20} />
        </button>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-panel border border-slate-200 dark:border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden max-h-[70vh] overflow-y-auto no-scrollbar z-50">
          {/* Active Search Results */}
          {query.trim().length >= 2 ? (
            <div>
              {isLoading ? (
                <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin"></div>
                  Searching campus map...
                </div>
              ) : results.length > 0 ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {results.map((loc, idx) => (
                    <li
                      key={loc.id}
                      onClick={() => handleSelectLocation(loc)}
                      className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                        idx === activeIndex
                          ? 'bg-slate-100 dark:bg-slate-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: loc.category?.color || '#4F46E5' }}
                        >
                          <Building size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                            {renderHighlightedText(loc.name, query)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {loc.department || loc.category?.name || 'Campus Building'}
                          </p>
                        </div>
                      </div>

                      <ArrowRight size={16} className="text-slate-400 ml-2 shrink-0" />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-center">
                  <p className="font-heading font-medium text-sm text-slate-700 dark:text-slate-300">
                    No locations found
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    No matches for &ldquo;{query}&rdquo;. Try searching for &lsquo;Library&rsquo;, &lsquo;Lab&rsquo;, or &lsquo;Cafeteria&rsquo;.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Recent Searches when query is empty */
            <div>
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Recent Searches
                    </span>
                    <button
                      onClick={clearAllRecents}
                      className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentSearches.map((item) => (
                      <li
                        key={item.id}
                        onClick={() => handleSelectRecent(item)}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-slate-400 shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">
                              {item.name}
                            </span>
                            <span className="text-xs text-slate-400">{item.categoryName}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => removeRecent(item.id, e)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  Type at least 2 characters to search campus facilities
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
