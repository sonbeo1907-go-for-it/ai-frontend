"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe2, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatTimeZoneOption,
  getSupportedTimeZones,
  isValidIanaTimeZone,
} from "@/lib/timezones";

export interface TimezonePickerProps {
  value?: string;
  onChange: (timeZone: string) => void;
  suggestedTimeZone?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export function TimezonePicker({
  value = "",
  onChange,
  suggestedTimeZone,
  disabled = false,
  className,
  id,
  placeholder = "Chọn múi giờ chuẩn IANA...",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: TimezonePickerProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listboxId = `${inputId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const allTimeZones = useMemo(() => getSupportedTimeZones(), []);

  // Filtered timezone items with formatted labels
  const filteredZones = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return allTimeZones;
    }
    return allTimeZones.filter((tz) => {
      const lower = tz.toLowerCase();
      const formatted = formatTimeZoneOption(tz).toLowerCase();
      return lower.includes(query) || formatted.includes(query);
    });
  }, [allTimeZones, searchQuery]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  // Keep highlighted item in view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeItem = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      if (activeItem && typeof activeItem.scrollIntoView === "function") {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  function handleSelect(tz: string) {
    onChange(tz);
    setSearchQuery("");
    setIsOpen(false);
  }

  function openPicker() {
    setSearchQuery("");
    setHighlightedIndex(0);
    setIsOpen(true);
  }

  function closePicker() {
    setSearchQuery("");
    setIsOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;

    if (!isOpen) {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        openPicker();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredZones.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredZones.length - 1));
        break;
      case "Enter":
        event.preventDefault();
        if (filteredZones[highlightedIndex]) {
          handleSelect(filteredZones[highlightedIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        closePicker();
        break;
      case "Tab":
        closePicker();
        break;
    }
  }

  const displayLabel = value
    ? formatTimeZoneOption(value)
    : placeholder;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        id={inputId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        onClick={() => (isOpen ? closePicker() : openPicker())}
        onKeyDown={handleKeyDown}
        className={cn(
          "focus-ring flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3.5 text-left text-sm transition",
          disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "cursor-pointer hover:border-slate-400",
          ariaInvalid ? "border-rose-500 text-rose-900" : "border-slate-300 text-slate-900",
          !value && "text-slate-400"
        )}
      >
        <span className="flex items-center gap-2.5 truncate">
          <Globe2 className="size-4 shrink-0 text-slate-400" />
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Suggested timezone quick button if different from current selection */}
      {suggestedTimeZone && suggestedTimeZone !== value && isValidIanaTimeZone(suggestedTimeZone) && (
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="truncate">Gợi ý từ trình duyệt: <strong className="font-semibold text-indigo-700">{suggestedTimeZone}</strong></span>
          <button
            type="button"
            onClick={() => handleSelect(suggestedTimeZone)}
            className="shrink-0 font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            Dùng gợi ý này
          </button>
        </div>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-72 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-fade-up">
          {/* Search Input Box */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              role="searchbox"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm theo tên thành phố, quốc gia, múi giờ..."
              className="focus-ring h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                aria-label="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <ul
            id={listboxId}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-label="Danh sách múi giờ"
            className="max-h-52 overflow-y-auto space-y-0.5 text-xs"
          >
            {filteredZones.length === 0 ? (
              <li className="px-3 py-4 text-center text-slate-400">
                Không tìm thấy múi giờ phù hợp
              </li>
            ) : (
              filteredZones.map((tz, index) => {
                const isSelected = tz === value;
                const isHighlighted = index === highlightedIndex;
                const formatted = formatTimeZoneOption(tz);

                return (
                  <li
                    key={tz}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(tz)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-slate-700 transition",
                      isHighlighted && "bg-indigo-50 text-indigo-950 font-semibold",
                      isSelected && "bg-indigo-600 text-white font-bold"
                    )}
                  >
                    <span className="truncate">{formatted}</span>
                    {isSelected && <Check className="size-3.5 shrink-0 ml-2 text-white" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
