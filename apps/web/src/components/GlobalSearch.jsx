import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';

/**
 * GlobalSearch Component
 * Search bar with autocomplete across test cases, bugs, and executions
 */
export default function GlobalSearch({ projectId, placeholder = 'Search tests, bugs...' }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);

  // Fetch suggestions
  const fetchSuggestions = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 1 || !projectId) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/search/suggestions?projectId=${projectId}&q=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuggestions(response.data.suggestions || []);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce suggestion fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 1) {
        fetchSuggestions(query);
        setIsOpen(true);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query || query.length < 2) return;

    // Navigate to search results page
    navigate(`/search?projectId=${projectId}&q=${encodeURIComponent(query)}`);
    setQuery('');
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleSelectSuggestion = (suggestion) => {
    navigate(suggestion.url);
    setQuery('');
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearch(e);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const getSuggestionIcon = (type) => {
    const icons = {
      TEST_CASE: '✅',
      BUG: '🐛',
      EXECUTION: '⚙️',
    };
    return icons[type] || '📄';
  };

  const getSuggestionColor = (type) => {
    const colors = {
      TEST_CASE: 'text-green-600',
      BUG: 'text-red-600',
      EXECUTION: 'text-blue-600',
    };
    return colors[type] || 'text-gray-600';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <form onSubmit={handleSearch} className="w-full">
        <div className="relative">
          {/* Search Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query && setIsOpen(true)}
            placeholder={placeholder}
            className="tt-input w-full pl-10 pr-4 py-2"
          />

          {/* Search Icon */}
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)]">
            🔍
          </span>

          {/* Loading Indicator */}
          {loading && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="animate-spin">⟳</span>
            </span>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] rounded-lg shadow-lg border border-[var(--border)] z-50 max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-[var(--bg-elevated)] transition-colors ${
                index === selectedIndex ? 'bg-[var(--bg-elevated)]' : ''
              }`}
            >
              <span className={`text-lg ${getSuggestionColor(suggestion.type)}`}>
                {getSuggestionIcon(suggestion.type)}
              </span>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text)] truncate">
                  {suggestion.text}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {suggestion.type.replace('_', ' ')}
                </div>
              </div>

              <span className="text-xs text-[var(--muted)] ml-2">→</span>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && !loading && query && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] rounded-lg shadow-lg border border-[var(--border)] p-4 text-center z-50">
          <p className="text-sm text-[var(--muted)]">No results found for "{query}"</p>
          <p className="text-xs text-[var(--muted)] mt-1">
            Try a different search term or press Enter to search
          </p>
        </div>
      )}
    </div>
  );
}
