"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Suggestion = {
  label: string;
  postcode: string;
  city: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

export default function AddressAutocomplete({ value, onChange, placeholder, required }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync si la valeur externe change (ex: reset du formulaire)
  useEffect(() => { setQuery(value); }, [value]);

  // Fermer le dropdown en cliquant hors du composant
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const fetchSuggestions = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`,
          { signal: AbortSignal.timeout(3000) }
        );
        const data = await res.json();
        const results: Suggestion[] = (data.features ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f: any) => ({
            label: f.properties.label,
            postcode: f.properties.postcode ?? "",
            city: f.properties.city ?? "",
          })
        );
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    fetchSuggestions(val);
  }

  function handleSelect(s: Suggestion) {
    setQuery(s.label);
    onChange(s.label);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          className="input pr-8"
          placeholder={placeholder ?? "12 rue des Lilas, 75001 Paris"}
          autoComplete="off"
          required={required}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm animate-pulse">
            ⏳
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-4 py-3 text-sm cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${
                i === activeIndex ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50 text-gray-800"
              }`}
            >
              <span className="font-medium">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
