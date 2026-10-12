import React, { useState, useRef, useEffect, useMemo } from 'react';
import { isSmartMatch } from '../utils/searchUtils';

export interface SelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode | string;
}

interface SearchableSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  searchPlaceholder?: string;
  icon?: React.ReactNode | string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  id?: string;
  name?: string;
  defaultOpen?: boolean;
  autoOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'اختر...',
  searchPlaceholder = 'ابحث هنا (يقبل كلمات منفصلة)...',
  icon,
  disabled = false,
  required = false,
  className = '',
  buttonClassName = '',
  id,
  name,
  defaultOpen = false,
  autoOpen = false,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || autoOpen);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync autoOpen prop if it changes dynamically
  useEffect(() => {
    if (autoOpen && !disabled) {
      setIsOpen(true);
    }
  }, [autoOpen, disabled]);

  // Notify parent of open state change if callback provided
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // On mobile, ensure open dropdown stays gently within viewport without jarring jumps
  useEffect(() => {
    if (isOpen && autoOpen) {
      const timer = setTimeout(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        if (rect.top < 60 || rect.bottom + 200 > viewportHeight) {
          containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoOpen]);

  // Normalize options into uniform SelectOption format
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Filter options based on smart search query (parts of words, non-consecutive tokens)
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    return normalizedOptions.filter((opt) => {
      const searchTarget = `${opt.label} ${opt.subLabel || ''} ${opt.value}`;
      return isSmartMatch(searchTarget, searchTerm);
    });
  }, [normalizedOptions, searchTerm]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string | number) => {
    onChange(String(val));
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    // User constraint: DO NOT autofocus search input automatically on open!
    // The mobile keyboard will open only when the user explicitly clicks the search input.
  };

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-[100]' : 'z-auto'} ${className}`}>
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          id={id}
          name={name}
          value={value ? String(value) : ''}
          onChange={() => {}}
          required
          tabIndex={-1}
          className="sr-only"
        />
      )}

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between text-right bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-extrabold text-sm sm:text-base py-3 sm:py-3.5 pr-11 pl-10 rounded-2xl border-2 shadow-sm transition-all cursor-pointer min-h-[48px] sm:min-h-[52px] select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900'
            : isOpen
            ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
            : 'border-blue-500/80 hover:border-blue-600 focus:border-blue-700'
        } ${buttonClassName}`}
      >
        <span className={`truncate block ${!selectedOption ? 'text-gray-400 dark:text-gray-500 font-normal' : 'text-gray-900 dark:text-gray-100'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        {/* Right Icon */}
        {icon && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-blue-700 dark:text-blue-400 text-lg">
            {icon}
          </span>
        )}

        {/* Left Arrow Icon */}
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-blue-700 dark:text-blue-400 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown Menu Container - High z-index to appear on top of all surrounding components */}
      {isOpen && (
        <div
          className="absolute z-[9999] w-full mt-1.5 bg-white dark:bg-gray-800 border-2 border-blue-500/90 dark:border-blue-600 shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-fade-in left-0 right-0"
          style={{ maxHeight: 'min(48vh, 320px)' }}
        >
          {/* Integrated Search Box inside the Dropdown (NO autoFocus so keyboard opens only upon user tap) */}
          <div className="p-2.5 bg-blue-50/70 dark:bg-gray-900/80 border-b border-blue-200 dark:border-gray-700 sticky top-0 z-10 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-blue-600 dark:text-blue-400 text-sm">
                🔍
              </span>
              <input
                ref={searchInputRef}
                type="text"
                autoFocus={false}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-xs sm:text-sm font-bold pr-8 pl-8 py-2 rounded-xl border border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  title="مسح البحث"
                >
                  ✕
                </button>
              )}
            </div>
            {searchTerm && (
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded-lg shrink-0">
                {filteredOptions.length}
              </span>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-700/60 p-1" role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-xs sm:text-sm font-bold">
                <span className="block text-2xl mb-1">🔍</span>
                لا توجد نتائج مطابقة لبحثك
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <div
                    key={String(option.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={`p-3 rounded-xl cursor-pointer text-xs sm:text-sm font-bold flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon && (
                        <span className="text-base shrink-0">
                          {option.icon}
                        </span>
                      )}
                      <div className="truncate">
                        <span className="block truncate">{option.label}</span>
                        {option.subLabel && (
                          <span className={`text-[10px] sm:text-xs block truncate ${isSelected ? 'text-blue-100' : 'text-gray-400 dark:text-gray-400'}`}>
                            {option.subLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-white text-base mr-2 shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
