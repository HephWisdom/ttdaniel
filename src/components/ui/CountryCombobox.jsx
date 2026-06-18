import { useId, useMemo, useState } from "react";
import { countries } from "../../data/countries";

function getCountrySuggestions(value) {
  const query = value.trim().toLocaleLowerCase();
  if (!query) return countries;

  return countries
    .filter(
      (country) =>
        country.name.toLocaleLowerCase().includes(query) ||
        country.code.toLocaleLowerCase().startsWith(query)
    )
    .sort((a, b) => {
      const aStartsWith = a.name.toLocaleLowerCase().startsWith(query);
      const bStartsWith = b.name.toLocaleLowerCase().startsWith(query);
      if (aStartsWith !== bStartsWith) return aStartsWith ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function resolveCountryMatch(value, suggestions) {
  const query = value.trim().toLocaleLowerCase();
  if (!query) return null;

  const exactMatch = countries.find(
    (country) =>
      country.name.toLocaleLowerCase() === query ||
      country.code.toLocaleLowerCase() === query
  );
  if (exactMatch) return exactMatch;

  const prefixMatches = suggestions.filter((country) =>
    country.name.toLocaleLowerCase().startsWith(query)
  );
  return prefixMatches.length === 1 ? prefixMatches[0] : null;
}

export default function CountryCombobox({ id, value, onChange, className = "" }) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestions = useMemo(() => {
    return getCountrySuggestions(value);
  }, [value]);

  const selectCountry = (country) => {
    onChange(country.name, country);
    setIsOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        suggestions.length ? Math.min(current + 1, suggestions.length - 1) : 0
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && isOpen && suggestions[activeIndex]) {
      event.preventDefault();
      selectCountry(suggestions[activeIndex]);
    }
  };

  const handleBlur = () => {
    const match = resolveCountryMatch(value, suggestions);
    if (match) {
      onChange(match.name, match);
    }
    window.setTimeout(() => setIsOpen(false), 120);
  };

  return (
    <div className="relative mt-2">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={isOpen}
        aria-activedescendant={
          isOpen && suggestions[activeIndex] ? `${listId}-${suggestions[activeIndex].code}` : undefined
        }
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          const nextSuggestions = getCountrySuggestions(nextValue);
          onChange(nextValue, resolveCountryMatch(nextValue, nextSuggestions));
          setIsOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder="Country"
        autoComplete="country-name"
        maxLength={80}
        required
      />

      {isOpen ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-black/10 bg-white p-1.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)]"
        >
          {suggestions.length ? (
            suggestions.map((country, index) => (
              <button
                id={`${listId}-${country.code}`}
                key={country.code}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectCountry(country)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                  index === activeIndex ? "bg-[#eee5d4] text-black" : "text-black/70 hover:bg-black/5"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {country.flag}
                </span>
                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                <span className="text-[10px] font-semibold text-black/40">
                  {country.dialCode || country.code}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-black/55">No matching country found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
