import { describe, it, expect } from "bun:test";
import {
  createSmartFieldMapping,
  applySmartFieldMapping,
  getTemplateFieldNames,
} from "../../web-clipper/field-mapper-smart";
import type { CachedSupertag } from "../../schema-cache";

// Helper to create test supertag
function createSupertag(
  name: string,
  fields: { name: string; dataType?: string }[],
): CachedSupertag {
  return {
    id: `test-${name}`,
    name,
    fields: fields.map((f) => ({
      id: `field-${f.name}`,
      name: f.name,
      dataType: f.dataType || "plain",
    })),
    lastUpdated: new Date().toISOString(),
  };
}

describe("Smart Field Mapper", () => {
  describe("createSmartFieldMapping", () => {
    it("should map exact field names", () => {
      const supertag = createSupertag("video", [
        { name: "URL", dataType: "url" },
        { name: "Channel" },
        { name: "Description" },
      ]);

      const mapping = createSmartFieldMapping(
        ["URL", "Channel", "Description"],
        supertag,
      );

      expect(mapping.fieldMap.URL).toBe("URL");
      expect(mapping.fieldMap.Channel).toBe("Channel");
      expect(mapping.fieldMap.Description).toBe("Description");
      expect(mapping.isComplete).toBe(true);
    });

    it("should map Channel to Author when Channel not present", () => {
      const supertag = createSupertag("video", [
        { name: "URL", dataType: "url" },
        { name: "Author" },
        { name: "Description" },
      ]);

      const mapping = createSmartFieldMapping(
        ["URL", "Channel", "Description"],
        supertag,
      );

      expect(mapping.fieldMap.Channel).toBe("Author");
    });

    it("should map Description to Summary when Description not present", () => {
      const supertag = createSupertag("article", [
        { name: "URL", dataType: "url" },
        { name: "Summary" },
      ]);

      const mapping = createSmartFieldMapping(["URL", "Description"], supertag);

      expect(mapping.fieldMap.Description).toBe("Summary");
    });

    it("should map URL to Link when URL not present", () => {
      const supertag = createSupertag("bookmark", [
        { name: "Link", dataType: "url" },
      ]);

      const mapping = createSmartFieldMapping(["URL"], supertag);

      expect(mapping.fieldMap.URL).toBe("Link");
    });

    it("should track unmapped fields", () => {
      const supertag = createSupertag("simple", [
        { name: "URL", dataType: "url" },
      ]);

      const mapping = createSmartFieldMapping(
        ["URL", "Channel", "Description"],
        supertag,
      );

      expect(mapping.unmappedFields).toContain("Channel");
      expect(mapping.unmappedFields).toContain("Description");
      expect(mapping.isComplete).toBe(false);
    });

    it("should be case-insensitive", () => {
      const supertag = createSupertag("video", [
        { name: "url", dataType: "url" },
        { name: "author" },
      ]);

      const mapping = createSmartFieldMapping(["URL", "Author"], supertag);

      expect(mapping.fieldMap.URL).toBe("url");
      expect(mapping.fieldMap.Author).toBe("author");
    });

    it("should map Clipped to Date field", () => {
      const supertag = createSupertag("bookmark", [
        { name: "URL", dataType: "url" },
        { name: "Date", dataType: "date" },
      ]);

      const mapping = createSmartFieldMapping(["URL", "Clipped"], supertag);

      expect(mapping.fieldMap.Clipped).toBe("Date");
    });
  });

  describe("applySmartFieldMapping", () => {
    it("should rename fields according to mapping", () => {
      const mapping = {
        fieldMap: {
          URL: "Link",
          Channel: "Author",
          Description: "Summary",
        },
        unmappedFields: [],
        isComplete: true,
      };

      const fields = {
        URL: "https://youtube.com/watch?v=123",
        Channel: "Test Channel",
        Description: "Test description",
      };

      const result = applySmartFieldMapping(fields, mapping);

      expect(result.Link).toBe("https://youtube.com/watch?v=123");
      expect(result.Author).toBe("Test Channel");
      expect(result.Summary).toBe("Test description");
      expect(result.URL).toBeUndefined();
      expect(result.Channel).toBeUndefined();
    });
  });

  describe("getTemplateFieldNames", () => {
    it("should extract field names from template", () => {
      const templateFields = {
        URL: "{{url}}",
        Channel: "{{author}}",
        Description: "{{description|truncate:200}}",
      };

      const names = getTemplateFieldNames(templateFields);

      expect(names).toContain("URL");
      expect(names).toContain("Channel");
      expect(names).toContain("Description");
      expect(names).toHaveLength(3);
    });
  });
});
