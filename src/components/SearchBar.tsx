import { useState, useMemo } from "react";
import type { Country, SearchMode } from "../types";
import { HISTORICAL_YEARS } from "../data/historicalYears";
import "./SearchBar.css";

interface SearchBarProps {
  countries: Country[];
  onSelectCountry: (country: Country) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

// 国名取得のヘルパー関数 (大文字小文字両対応)
function getCountryName(country: Country): string {
  return country.properties.NAME || "";
}

function getCountryNameJa(country: Country): string {
  return country.properties.NAME_JA || "";
}

export default function SearchBar({
  countries,
  onSelectCountry,
  searchMode,
  onSearchModeChange,
  selectedYear,
  onYearChange,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return countries
      .filter((country) => {
        const name = getCountryName(country).toLowerCase();
        const nameJa = getCountryNameJa(country).toLowerCase();
        return name.includes(lowerQuery) || nameJa.includes(lowerQuery);
      })
      .slice(0, 10);
  }, [query, countries]);

  const handleSelect = (country: Country) => {
    setQuery("");
    setShowSuggestions(false);
    onSelectCountry(country);
  };

  return (
    <div className="search-bar-container">
      {/* モード切り替えボタン */}
      <div className="mode-toggle">
        <button
          onClick={() => onSearchModeChange("modern")}
          className={searchMode === "modern" ? "active" : ""}
        >
          現代
        </button>
        <button
          onClick={() => onSearchModeChange("historical")}
          className={searchMode === "historical" ? "active" : ""}
        >
          歴史
        </button>
      </div>

      {/* 歴史モード時の年代選択 */}
      {searchMode === "historical" && (
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="year-select"
        >
          {HISTORICAL_YEARS.map((y) => (
            <option key={y.year} value={y.year}>
              {y.label}
            </option>
          ))}
        </select>
      )}

      {/* 検索バー */}
      <div className="search-bar-input-wrapper">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          placeholder={
            searchMode === "modern" ? "現代国を検索..." : "歴史的国家を検索..."
          }
          className="search-bar-input"
        />

        {showSuggestions && suggestions.length > 0 && (
          <ul className="search-suggestions">
            {suggestions.map((country, index) => (
              <li
                key={index}
                onClick={() => handleSelect(country)}
                className="suggestion-item"
              >
                <div className="suggestion-item-name">
                  {country.properties.NAME_JA || country.properties.NAME}
                </div>
                {country.properties.NAME_JA && country.properties.NAME && (
                  <div className="suggestion-item-name-ja">
                    {country.properties.NAME}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
