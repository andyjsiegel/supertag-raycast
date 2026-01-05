import { describe, it, expect } from "bun:test";
import {
  truncate,
  defaultValue,
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
  parseFilterExpression,
  applyFilters,
  defaultFilters,
} from "../../web-clipper/filters";

describe("Template filters", () => {
  describe("truncate", () => {
    it("should truncate text longer than max length", () => {
      expect(truncate("Hello World", "8")).toBe("Hello...");
    });

    it("should not truncate text shorter than max length", () => {
      expect(truncate("Hello", "10")).toBe("Hello");
    });

    it("should handle exact length", () => {
      expect(truncate("Hello", "5")).toBe("Hello");
    });

    it("should use default max of 100", () => {
      const longText = "a".repeat(150);
      const result = truncate(longText);
      expect(result.length).toBe(100);
      expect(result.endsWith("...")).toBe(true);
    });

    it("should handle invalid max length", () => {
      expect(truncate("Hello World", "invalid")).toBe("Hello World");
    });
  });

  describe("defaultValue", () => {
    it("should return fallback for empty string", () => {
      expect(defaultValue("", "fallback")).toBe("fallback");
    });

    it("should return fallback for whitespace-only string", () => {
      expect(defaultValue("   ", "fallback")).toBe("fallback");
    });

    it("should return original value if not empty", () => {
      expect(defaultValue("value", "fallback")).toBe("value");
    });

    it("should handle empty fallback", () => {
      expect(defaultValue("", "")).toBe("");
    });
  });

  describe("lower", () => {
    it("should convert to lowercase", () => {
      expect(lower("HELLO WORLD")).toBe("hello world");
    });

    it("should handle mixed case", () => {
      expect(lower("HeLLo WoRLD")).toBe("hello world");
    });

    it("should handle already lowercase", () => {
      expect(lower("hello")).toBe("hello");
    });
  });

  describe("upper", () => {
    it("should convert to uppercase", () => {
      expect(upper("hello world")).toBe("HELLO WORLD");
    });

    it("should handle mixed case", () => {
      expect(upper("HeLLo WoRLD")).toBe("HELLO WORLD");
    });
  });

  describe("capitalize", () => {
    it("should capitalize first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
    });

    it("should handle already capitalized", () => {
      expect(capitalize("Hello")).toBe("Hello");
    });

    it("should handle empty string", () => {
      expect(capitalize("")).toBe("");
    });

    it("should not affect rest of string", () => {
      expect(capitalize("hELLO")).toBe("HELLO");
    });
  });

  describe("strip", () => {
    it("should remove HTML tags", () => {
      expect(strip("<p>Hello</p>")).toBe("Hello");
    });

    it("should remove multiple tags", () => {
      expect(strip("<div><p>Hello</p> <span>World</span></div>")).toBe(
        "Hello World",
      );
    });

    it("should handle self-closing tags", () => {
      expect(strip("Hello<br/>World")).toBe("HelloWorld");
    });

    it("should handle attributes", () => {
      expect(strip('<a href="url">Link</a>')).toBe("Link");
    });
  });

  describe("wordcount", () => {
    it("should count words", () => {
      expect(wordcount("Hello World")).toBe("2");
    });

    it("should handle multiple spaces", () => {
      expect(wordcount("Hello    World")).toBe("2");
    });

    it("should handle empty string", () => {
      expect(wordcount("")).toBe("0");
    });

    it("should handle single word", () => {
      expect(wordcount("Hello")).toBe("1");
    });
  });

  describe("readtime", () => {
    it("should calculate reading time", () => {
      const text = Array(400).fill("word").join(" ");
      expect(readtime(text, "200")).toBe("2");
    });

    it("should round up", () => {
      const text = Array(250).fill("word").join(" ");
      expect(readtime(text, "200")).toBe("2");
    });

    it("should use default 200 wpm", () => {
      const text = Array(200).fill("word").join(" ");
      expect(readtime(text)).toBe("1");
    });
  });

  describe("format", () => {
    it("should format date with YYYY-MM-DD pattern", () => {
      expect(format("2026-01-05T12:30:00Z", "YYYY-MM-DD")).toBe("2026-01-05");
    });

    it("should format date with time", () => {
      const result = format("2026-01-05T12:30:45Z", "YYYY-MM-DD HH:mm:ss");
      // Note: Time will be in local timezone
      expect(result).toMatch(/2026-01-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it("should handle invalid date", () => {
      expect(format("invalid", "YYYY-MM-DD")).toBe("invalid");
    });

    it("should use default pattern", () => {
      expect(format("2026-01-05T00:00:00Z")).toBe("2026-01-05");
    });
  });

  describe("first", () => {
    it("should take first N characters", () => {
      expect(first("Hello World", "5")).toBe("Hello");
    });

    it("should handle shorter string", () => {
      expect(first("Hi", "10")).toBe("Hi");
    });

    it("should handle invalid count", () => {
      expect(first("Hello", "invalid")).toBe("Hello");
    });
  });

  describe("last", () => {
    it("should take last N characters", () => {
      expect(last("Hello World", "5")).toBe("World");
    });

    it("should handle shorter string", () => {
      expect(last("Hi", "10")).toBe("Hi");
    });

    it("should handle invalid count", () => {
      expect(last("Hello", "invalid")).toBe("Hello");
    });
  });

  describe("replace", () => {
    it("should replace occurrences", () => {
      expect(replace("Hello World", "World", "Universe")).toBe(
        "Hello Universe",
      );
    });

    it("should replace all occurrences", () => {
      expect(replace("a-b-c", "-", "_")).toBe("a_b_c");
    });

    it("should handle no match", () => {
      expect(replace("Hello", "x", "y")).toBe("Hello");
    });
  });

  describe("trim", () => {
    it("should trim whitespace", () => {
      expect(trim("  Hello World  ")).toBe("Hello World");
    });

    it("should handle tabs and newlines", () => {
      expect(trim("\t\nHello\n\t")).toBe("Hello");
    });
  });

  describe("join", () => {
    it("should join JSON array", () => {
      expect(join('["a","b","c"]', ", ")).toBe("a, b, c");
    });

    it("should use custom separator", () => {
      expect(join('["a","b","c"]', " | ")).toBe("a | b | c");
    });

    it("should return as-is for non-array", () => {
      expect(join("not an array", ", ")).toBe("not an array");
    });

    it("should handle invalid JSON", () => {
      expect(join("[invalid", ", ")).toBe("[invalid");
    });
  });

  describe("wrap", () => {
    it("should wrap with prefix and suffix", () => {
      expect(wrap("value", "<<", ">>")).toBe("<<value>>");
    });

    it("should return empty for empty value", () => {
      expect(wrap("", "<<", ">>")).toBe("");
    });

    it("should return empty for whitespace-only", () => {
      expect(wrap("   ", "<<", ">>")).toBe("");
    });

    it("should handle prefix only", () => {
      expect(wrap("value", "by ", "")).toBe("by value");
    });
  });

  describe("hideif", () => {
    it("should return empty if matches pattern", () => {
      expect(hideif("undefined", "undefined")).toBe("");
    });

    it("should be case-insensitive", () => {
      expect(hideif("UNDEFINED", "undefined")).toBe("");
    });

    it("should return value if no match", () => {
      expect(hideif("value", "undefined")).toBe("value");
    });
  });

  describe("parseFilterExpression", () => {
    it("should parse filter without args", () => {
      expect(parseFilterExpression("upper")).toEqual(["upper"]);
    });

    it("should parse filter with one arg", () => {
      expect(parseFilterExpression("truncate:50")).toEqual(["truncate", "50"]);
    });

    it("should parse filter with multiple args", () => {
      expect(parseFilterExpression("replace:old:new")).toEqual([
        "replace",
        "old",
        "new",
      ]);
    });

    it("should handle quoted args", () => {
      expect(parseFilterExpression("default:'No value'")).toEqual([
        "default",
        "No value",
      ]);
    });

    it("should handle double-quoted args", () => {
      expect(parseFilterExpression('default:"No value"')).toEqual([
        "default",
        "No value",
      ]);
    });
  });

  describe("applyFilters", () => {
    it("should apply single filter", () => {
      expect(applyFilters("hello", ["upper"], defaultFilters)).toBe("HELLO");
    });

    it("should apply filter chain", () => {
      expect(
        applyFilters("  hello world  ", ["trim", "upper"], defaultFilters),
      ).toBe("HELLO WORLD");
    });

    it("should apply filter with args", () => {
      expect(applyFilters("Hello World", ["truncate:8"], defaultFilters)).toBe(
        "Hello...",
      );
    });

    it("should ignore unknown filters", () => {
      expect(applyFilters("hello", ["unknownfilter"], defaultFilters)).toBe(
        "hello",
      );
    });

    it("should handle empty chain", () => {
      expect(applyFilters("hello", [], defaultFilters)).toBe("hello");
    });
  });

  describe("defaultFilters registry", () => {
    it("should contain all expected filters", () => {
      const expectedFilters = [
        "truncate",
        "default",
        "lower",
        "upper",
        "capitalize",
        "strip",
        "wordcount",
        "readtime",
        "format",
        "first",
        "last",
        "replace",
        "trim",
        "join",
        "wrap",
        "hideif",
      ];
      for (const name of expectedFilters) {
        expect(defaultFilters[name]).toBeDefined();
      }
    });
  });
});
