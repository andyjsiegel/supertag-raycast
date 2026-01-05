import { describe, it, expect } from "bun:test";
import {
  renderTemplateString,
  renderTemplate,
  matchesDomainPattern,
  findMatchingTemplate,
  createTemplateContext,
  validateTemplate,
} from "../../web-clipper/template";
import type {
  ClipTemplate,
  TemplateContext,
} from "../../web-clipper/template-types";

describe("Template engine", () => {
  describe("renderTemplateString", () => {
    const context: TemplateContext = {
      title: "Test Article",
      url: "https://example.com/article",
      domain: "example.com",
      date: "2026-01-05T12:00:00Z",
      description: "A test article description",
      author: "John Doe",
      selection: "Selected text here",
    };

    it("should substitute simple variables", () => {
      expect(renderTemplateString("{{title}}", context)).toBe("Test Article");
    });

    it("should handle multiple variables", () => {
      expect(renderTemplateString("{{title}} by {{author}}", context)).toBe(
        "Test Article by John Doe",
      );
    });

    it("should handle missing variables", () => {
      expect(renderTemplateString("{{nonexistent}}", context)).toBe("");
    });

    it("should apply filters", () => {
      expect(renderTemplateString("{{title|upper}}", context)).toBe(
        "TEST ARTICLE",
      );
    });

    it("should apply filter chain", () => {
      expect(renderTemplateString("{{title|upper|first:4}}", context)).toBe(
        "TEST",
      );
    });

    it("should apply default filter", () => {
      expect(renderTemplateString("{{missing|default:'N/A'}}", context)).toBe(
        "N/A",
      );
    });

    it("should apply truncate filter", () => {
      expect(renderTemplateString("{{description|truncate:20}}", context)).toBe(
        "A test article de...",
      );
    });

    it("should handle text with variables", () => {
      expect(
        renderTemplateString("Article: {{title}} from {{domain}}", context),
      ).toBe("Article: Test Article from example.com");
    });

    it("should preserve text without variables", () => {
      expect(renderTemplateString("No variables here", context)).toBe(
        "No variables here",
      );
    });

    it("should handle nested access with dot notation", () => {
      const contextWithNested = {
        ...context,
        meta: { language: "en" },
      };
      expect(
        renderTemplateString(
          "{{meta.language}}",
          contextWithNested as TemplateContext,
        ),
      ).toBe("en");
    });

    it("should convert keypoints array to JSON", () => {
      const contextWithKeypoints: TemplateContext = {
        ...context,
        keypoints: ["Point 1", "Point 2"],
      };
      expect(renderTemplateString("{{keypoints}}", contextWithKeypoints)).toBe(
        '["Point 1","Point 2"]',
      );
    });

    it("should handle numeric values", () => {
      const contextWithReadtime: TemplateContext = {
        ...context,
        readtime: 5,
      };
      expect(
        renderTemplateString("{{readtime}} min", contextWithReadtime),
      ).toBe("5 min");
    });
  });

  describe("renderTemplate", () => {
    const template: ClipTemplate = {
      id: "test",
      name: "Test Template",
      triggers: ["example.com"],
      supertag: "#article",
      fields: {
        URL: "{{url}}",
        Title: "{{title}}",
        Author: "{{author|default:''}}",
      },
      contentTemplate: "{{selection|default:''}}",
    };

    const context: TemplateContext = {
      title: "Test Article",
      url: "https://example.com/article",
      domain: "example.com",
      date: "2026-01-05T12:00:00Z",
      author: "John Doe",
      selection: "Important quote",
    };

    it("should render supertag", () => {
      const result = renderTemplate(template, context);
      expect(result.supertag).toBe("#article");
    });

    it("should render fields", () => {
      const result = renderTemplate(template, context);
      expect(result.fields.URL).toBe("https://example.com/article");
      expect(result.fields.Title).toBe("Test Article");
      expect(result.fields.Author).toBe("John Doe");
    });

    it("should render content template", () => {
      const result = renderTemplate(template, context);
      expect(result.content).toBe("Important quote");
    });

    it("should omit empty fields", () => {
      const contextNoAuthor: TemplateContext = {
        ...context,
        author: undefined,
      };
      const result = renderTemplate(template, contextNoAuthor);
      expect(result.fields.Author).toBeUndefined();
    });

    it("should set content to undefined if empty", () => {
      const contextNoSelection: TemplateContext = {
        ...context,
        selection: undefined,
      };
      const result = renderTemplate(template, contextNoSelection);
      expect(result.content).toBeUndefined();
    });
  });

  describe("matchesDomainPattern", () => {
    it("should match exact domain", () => {
      expect(matchesDomainPattern("https://github.com/", "github.com")).toBe(
        true,
      );
    });

    it("should match domain with path", () => {
      expect(
        matchesDomainPattern("https://github.com/user/repo", "github.com/*"),
      ).toBe(true);
    });

    it("should match multi-level path", () => {
      expect(
        matchesDomainPattern("https://github.com/user/repo", "github.com/*/*"),
      ).toBe(true);
    });

    it("should match subdomain wildcard", () => {
      expect(
        matchesDomainPattern(
          "https://blog.medium.com/article",
          "*.medium.com/*",
        ),
      ).toBe(true);
    });

    it("should strip www prefix", () => {
      expect(
        matchesDomainPattern("https://www.github.com/", "github.com"),
      ).toBe(true);
    });

    it("should not match different domain", () => {
      expect(matchesDomainPattern("https://gitlab.com/", "github.com")).toBe(
        false,
      );
    });

    it("should match YouTube watch URL", () => {
      expect(
        matchesDomainPattern(
          "https://youtube.com/watch?v=abc123",
          "youtube.com/watch*",
        ),
      ).toBe(true);
    });

    it("should match Twitter status URL", () => {
      expect(
        matchesDomainPattern(
          "https://twitter.com/user/status/123",
          "twitter.com/*/status/*",
        ),
      ).toBe(true);
    });

    it("should match x.com status URL", () => {
      expect(
        matchesDomainPattern(
          "https://x.com/user/status/123",
          "x.com/*/status/*",
        ),
      ).toBe(true);
    });

    it("should match catch-all pattern", () => {
      expect(matchesDomainPattern("https://random-site.com/page", "*")).toBe(
        true,
      );
    });

    it("should handle invalid URL gracefully", () => {
      expect(matchesDomainPattern("not-a-url", "example.com")).toBe(false);
    });
  });

  describe("findMatchingTemplate", () => {
    const templates: ClipTemplate[] = [
      {
        id: "github-issue",
        name: "GitHub Issue",
        triggers: ["github.com/*/*/issues/*"],
        supertag: "#issue",
        fields: {},
      },
      {
        id: "github-repo",
        name: "GitHub Repo",
        triggers: ["github.com/*/*"],
        supertag: "#repo",
        fields: {},
      },
      {
        id: "generic",
        name: "Generic",
        triggers: ["*"],
        supertag: "#article",
        fields: {},
      },
    ];

    it("should find most specific match", () => {
      const result = findMatchingTemplate(
        "https://github.com/user/repo/issues/123",
        templates,
      );
      expect(result?.id).toBe("github-issue");
    });

    it("should fall back to less specific match", () => {
      const result = findMatchingTemplate(
        "https://github.com/user/repo",
        templates,
      );
      expect(result?.id).toBe("github-repo");
    });

    it("should fall back to catch-all", () => {
      const result = findMatchingTemplate(
        "https://example.com/page",
        templates,
      );
      expect(result?.id).toBe("generic");
    });

    it("should return undefined for no match (no catch-all)", () => {
      const templatesNoGeneric = templates.filter((t) => t.id !== "generic");
      const result = findMatchingTemplate(
        "https://example.com/page",
        templatesNoGeneric,
      );
      expect(result).toBeUndefined();
    });
  });

  describe("createTemplateContext", () => {
    it("should create context with required fields", () => {
      const context = createTemplateContext({
        url: "https://example.com/article",
        title: "Test Article",
      });
      expect(context.url).toBe("https://example.com/article");
      expect(context.title).toBe("Test Article");
      expect(context.domain).toBe("example.com");
      expect(context.date).toBeDefined();
    });

    it("should strip www from domain", () => {
      const context = createTemplateContext({
        url: "https://www.example.com/article",
        title: "Test",
      });
      expect(context.domain).toBe("example.com");
    });

    it("should include optional fields", () => {
      const context = createTemplateContext({
        url: "https://example.com/article",
        title: "Test",
        author: "John Doe",
        description: "Description",
        selection: "Selected text",
        keypoints: ["Point 1", "Point 2"],
      });
      expect(context.author).toBe("John Doe");
      expect(context.description).toBe("Description");
      expect(context.selection).toBe("Selected text");
      expect(context.keypoints).toEqual(["Point 1", "Point 2"]);
    });

    it("should handle invalid URL gracefully", () => {
      const context = createTemplateContext({
        url: "not-a-url",
        title: "Test",
      });
      expect(context.domain).toBe("not-a-url");
    });
  });

  describe("validateTemplate", () => {
    it("should accept valid template", () => {
      const template: Partial<ClipTemplate> = {
        id: "test",
        name: "Test",
        triggers: ["example.com"],
        supertag: "#test",
        fields: { URL: "{{url}}" },
      };
      const errors = validateTemplate(template);
      expect(errors).toHaveLength(0);
    });

    it("should require id", () => {
      const template: Partial<ClipTemplate> = {
        name: "Test",
        triggers: ["example.com"],
        supertag: "#test",
        fields: { URL: "{{url}}" },
      };
      const errors = validateTemplate(template);
      expect(errors).toContain("Template ID is required");
    });

    it("should require name", () => {
      const template: Partial<ClipTemplate> = {
        id: "test",
        triggers: ["example.com"],
        supertag: "#test",
        fields: { URL: "{{url}}" },
      };
      const errors = validateTemplate(template);
      expect(errors).toContain("Template name is required");
    });

    it("should require triggers", () => {
      const template: Partial<ClipTemplate> = {
        id: "test",
        name: "Test",
        supertag: "#test",
        fields: { URL: "{{url}}" },
      };
      const errors = validateTemplate(template);
      expect(errors).toContain("At least one trigger pattern is required");
    });

    it("should require supertag", () => {
      const template: Partial<ClipTemplate> = {
        id: "test",
        name: "Test",
        triggers: ["example.com"],
        fields: { URL: "{{url}}" },
      };
      const errors = validateTemplate(template);
      expect(errors).toContain("Supertag is required");
    });

    it("should require at least one field", () => {
      const template: Partial<ClipTemplate> = {
        id: "test",
        name: "Test",
        triggers: ["example.com"],
        supertag: "#test",
        fields: {},
      };
      const errors = validateTemplate(template);
      expect(errors).toContain("At least one field mapping is required");
    });

    it("should reject empty string values", () => {
      const template: Partial<ClipTemplate> = {
        id: "",
        name: "  ",
        triggers: ["example.com"],
        supertag: "#test",
        fields: { URL: "{{url}}" },
      };
      const errors = validateTemplate(template);
      expect(errors).toContain("Template ID is required");
      expect(errors).toContain("Template name is required");
    });
  });
});
