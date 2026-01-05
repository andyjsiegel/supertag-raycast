/**
 * Template Filters for Web Clipper
 *
 * Filters transform template variable values using pipe syntax:
 * {{title|truncate:50}}
 * {{date|format:"YYYY-MM-DD"}}
 * {{selection|default:"No selection"}}
 */

import type { FilterFunction, FilterRegistry } from "./template-types";

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 * Usage: {{title|truncate:50}}
 */
export const truncate: FilterFunction = (value, maxLength = "100") => {
  const max = parseInt(maxLength, 10);
  if (isNaN(max) || value.length <= max) {
    return value;
  }
  return value.slice(0, max - 3).trim() + "...";
};

/**
 * Provide a default value if the input is empty
 * Usage: {{selection|default:"No selection"}}
 */
export const defaultValue: FilterFunction = (value, fallback = "") => {
  if (!value || value.trim() === "") {
    return fallback;
  }
  return value;
};

/**
 * Convert to lowercase
 * Usage: {{title|lower}}
 */
export const lower: FilterFunction = (value) => {
  return value.toLowerCase();
};

/**
 * Convert to uppercase
 * Usage: {{title|upper}}
 */
export const upper: FilterFunction = (value) => {
  return value.toUpperCase();
};

/**
 * Capitalize first letter
 * Usage: {{title|capitalize}}
 */
export const capitalize: FilterFunction = (value) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

/**
 * Strip HTML tags from content
 * Usage: {{content|strip}}
 */
export const strip: FilterFunction = (value) => {
  return value.replace(/<[^>]*>/g, "");
};

/**
 * Count words in text
 * Usage: {{content|wordcount}}
 */
export const wordcount: FilterFunction = (value) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return String(words.length);
};

/**
 * Calculate reading time in minutes (assumes 200 wpm)
 * Usage: {{content|readtime}}
 */
export const readtime: FilterFunction = (value, wpm = "200") => {
  const wordsPerMinute = parseInt(wpm, 10) || 200;
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return String(minutes);
};

/**
 * Format a date string
 * Usage: {{date|format:"YYYY-MM-DD"}}
 * Supports: YYYY, MM, DD, HH, mm, ss
 */
export const format: FilterFunction = (value, pattern = "YYYY-MM-DD") => {
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return value;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return pattern
      .replace("YYYY", String(year))
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  } catch {
    return value;
  }
};

/**
 * Take first N characters
 * Usage: {{description|first:100}}
 */
export const first: FilterFunction = (value, count = "100") => {
  const n = parseInt(count, 10);
  if (isNaN(n)) return value;
  return value.slice(0, n);
};

/**
 * Take last N characters
 * Usage: {{url|last:50}}
 */
export const last: FilterFunction = (value, count = "50") => {
  const n = parseInt(count, 10);
  if (isNaN(n)) return value;
  return value.slice(-n);
};

/**
 * Replace occurrences
 * Usage: {{title|replace:"old":"new"}}
 */
export const replace: FilterFunction = (
  value,
  search = "",
  replacement = "",
) => {
  return value.split(search).join(replacement);
};

/**
 * Trim whitespace
 * Usage: {{selection|trim}}
 */
export const trim: FilterFunction = (value) => {
  return value.trim();
};

/**
 * Join array with separator (for keypoints)
 * Usage: {{keypoints|join:", "}}
 */
export const join: FilterFunction = (value, separator = ", ") => {
  // If value looks like a JSON array, parse and join
  if (value.startsWith("[")) {
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) {
        return arr.join(separator);
      }
    } catch {
      // Not valid JSON, return as-is
    }
  }
  return value;
};

/**
 * Wrap value with prefix and suffix
 * Usage: {{author|wrap:"by ":""}}
 */
export const wrap: FilterFunction = (value, prefix = "", suffix = "") => {
  if (!value || value.trim() === "") return "";
  return `${prefix}${value}${suffix}`;
};

/**
 * Return empty string if value matches pattern
 * Usage: {{description|hideif:"undefined"}}
 */
export const hideif: FilterFunction = (value, pattern = "") => {
  if (value === pattern || value.toLowerCase() === pattern.toLowerCase()) {
    return "";
  }
  return value;
};

/**
 * Default filter registry with all available filters
 */
export const defaultFilters: FilterRegistry = {
  truncate,
  default: defaultValue,
  lower,
  upper,
  capitalize,
  strip,
  wordcount,
  readtime,
  format,
  first,
  last,
  replace,
  trim,
  join,
  wrap,
  hideif,
};

/**
 * Parse a filter expression like "truncate:50" or "default:'No value'"
 * @returns [filterName, ...args]
 */
export function parseFilterExpression(expr: string): [string, ...string[]] {
  // Handle filter with no args
  if (!expr.includes(":")) {
    return [expr.trim()];
  }

  const colonIndex = expr.indexOf(":");
  const filterName = expr.slice(0, colonIndex).trim();
  const argsString = expr.slice(colonIndex + 1);

  // Parse arguments (handle quoted strings and multiple args with :)
  const args: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];

    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuote) {
      inQuote = false;
      quoteChar = "";
    } else if (char === ":" && !inQuote) {
      args.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current.trim());
  }

  return [filterName, ...args];
}

/**
 * Apply a chain of filters to a value
 * @param value - The input value
 * @param filterChain - Array of filter expressions (e.g., ["truncate:50", "upper"])
 * @param registry - Filter registry to use
 * @returns The transformed value
 */
export function applyFilters(
  value: string,
  filterChain: string[],
  registry: FilterRegistry = defaultFilters,
): string {
  let result = value;

  for (const filterExpr of filterChain) {
    const [filterName, ...args] = parseFilterExpression(filterExpr);
    const filterFn = registry[filterName];

    if (filterFn) {
      result = filterFn(result, ...args);
    } else {
      console.warn(`Unknown filter: ${filterName}`);
    }
  }

  return result;
}
