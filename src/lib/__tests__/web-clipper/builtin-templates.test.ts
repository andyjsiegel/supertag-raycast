import { describe, it, expect } from "bun:test";
import {
  builtinTemplates,
  getBuiltinTemplate,
  isBuiltinTemplate,
  githubRepoTemplate,
  githubIssueTemplate,
  youtubeTemplate,
  twitterTemplate,
  mediumTemplate,
  hackerNewsTemplate,
  redditTemplate,
  wikipediaTemplate,
  stackOverflowTemplate,
  genericArticleTemplate,
} from "../../web-clipper/builtin-templates";
import {
  matchesDomainPattern,
  renderTemplate,
  createTemplateContext,
} from "../../web-clipper/template";

describe("Builtin templates", () => {
  describe("template registry", () => {
    it("should have 10 builtin templates", () => {
      expect(builtinTemplates).toHaveLength(10);
    });

    it("should all be marked as builtin", () => {
      for (const template of builtinTemplates) {
        expect(template.isBuiltin).toBe(true);
      }
    });

    it("should all have builtin: prefix in ID", () => {
      for (const template of builtinTemplates) {
        expect(template.id.startsWith("builtin:")).toBe(true);
      }
    });
  });

  describe("getBuiltinTemplate", () => {
    it("should find template by ID", () => {
      const template = getBuiltinTemplate("builtin:github-repo");
      expect(template).toBeDefined();
      expect(template?.name).toBe("GitHub Repository");
    });

    it("should return undefined for unknown ID", () => {
      expect(getBuiltinTemplate("builtin:nonexistent")).toBeUndefined();
    });
  });

  describe("isBuiltinTemplate", () => {
    it("should return true for builtin IDs", () => {
      expect(isBuiltinTemplate("builtin:github-repo")).toBe(true);
      expect(isBuiltinTemplate("builtin:anything")).toBe(true);
    });

    it("should return false for user IDs", () => {
      expect(isBuiltinTemplate("user:custom")).toBe(false);
      expect(isBuiltinTemplate("custom")).toBe(false);
    });
  });

  describe("GitHub Repository template", () => {
    it("should match github.com repo URLs", () => {
      expect(
        matchesDomainPattern(
          "https://github.com/user/repo",
          githubRepoTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should not match github.com root", () => {
      expect(
        matchesDomainPattern(
          "https://github.com",
          githubRepoTemplate.triggers[0],
        ),
      ).toBe(false);
    });

    it("should render correctly", () => {
      const context = createTemplateContext({
        url: "https://github.com/anthropics/claude-code",
        title: "anthropics/claude-code",
        description: "Claude Code CLI tool",
        author: "Anthropic",
      });
      const result = renderTemplate(githubRepoTemplate, context);
      expect(result.supertag).toBe("#repository");
      expect(result.fields.URL).toBe(
        "https://github.com/anthropics/claude-code",
      );
      expect(result.fields.Description).toBe("Claude Code CLI tool");
    });
  });

  describe("GitHub Issue template", () => {
    it("should match github issue URLs", () => {
      expect(
        matchesDomainPattern(
          "https://github.com/user/repo/issues/123",
          githubIssueTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should match github PR URLs", () => {
      expect(
        matchesDomainPattern(
          "https://github.com/user/repo/pull/456",
          githubIssueTemplate.triggers[1],
        ),
      ).toBe(true);
    });

    it("should have higher priority than repo template", () => {
      // Issues template comes before repo template
      const issueIndex = builtinTemplates.indexOf(githubIssueTemplate);
      const repoIndex = builtinTemplates.indexOf(githubRepoTemplate);
      expect(issueIndex).toBeLessThan(repoIndex);
    });
  });

  describe("YouTube template", () => {
    it("should match youtube.com/watch URLs", () => {
      expect(
        matchesDomainPattern(
          "https://youtube.com/watch?v=abc123",
          youtubeTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should match youtu.be short URLs", () => {
      expect(
        matchesDomainPattern(
          "https://youtu.be/abc123",
          youtubeTemplate.triggers[1],
        ),
      ).toBe(true);
    });

    it("should match youtube shorts", () => {
      expect(
        matchesDomainPattern(
          "https://youtube.com/shorts/abc123",
          youtubeTemplate.triggers[2],
        ),
      ).toBe(true);
    });

    it("should render with truncated description", () => {
      const context = createTemplateContext({
        url: "https://youtube.com/watch?v=abc123",
        title: "Test Video",
        description: "A".repeat(300),
        author: "Test Channel",
      });
      const result = renderTemplate(youtubeTemplate, context);
      expect(result.supertag).toBe("#video");
      expect(result.fields.Channel).toBe("Test Channel");
      expect(result.fields.Description?.length).toBeLessThanOrEqual(200);
    });
  });

  describe("Twitter/X template", () => {
    it("should match twitter.com status URLs", () => {
      expect(
        matchesDomainPattern(
          "https://twitter.com/user/status/123",
          twitterTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should match x.com status URLs", () => {
      expect(
        matchesDomainPattern(
          "https://x.com/user/status/123",
          twitterTemplate.triggers[1],
        ),
      ).toBe(true);
    });

    it("should match mobile twitter URLs", () => {
      expect(
        matchesDomainPattern(
          "https://mobile.twitter.com/user/status/123",
          twitterTemplate.triggers[2],
        ),
      ).toBe(true);
    });

    it("should have content template using selection", () => {
      expect(twitterTemplate.contentTemplate).toBe(
        "{{selection|default:description}}",
      );
    });
  });

  describe("Medium template", () => {
    it("should match medium.com URLs", () => {
      expect(
        matchesDomainPattern(
          "https://medium.com/@user/article-title",
          mediumTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should match custom Medium domains", () => {
      expect(
        matchesDomainPattern(
          "https://blog.medium.com/article",
          mediumTemplate.triggers[1],
        ),
      ).toBe(true);
    });

    it("should include reading time field", () => {
      expect(mediumTemplate.fields["Reading Time"]).toBeDefined();
    });
  });

  describe("Hacker News template", () => {
    it("should match HN item URLs", () => {
      expect(
        matchesDomainPattern(
          "https://news.ycombinator.com/item?id=123",
          hackerNewsTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should use #discussion supertag", () => {
      expect(hackerNewsTemplate.supertag).toBe("#discussion");
    });
  });

  describe("Reddit template", () => {
    it("should match reddit post URLs", () => {
      expect(
        matchesDomainPattern(
          "https://reddit.com/r/programming/comments/abc123/title",
          redditTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should match old.reddit URLs", () => {
      expect(
        matchesDomainPattern(
          "https://old.reddit.com/r/programming/comments/abc123/title",
          redditTemplate.triggers[1],
        ),
      ).toBe(true);
    });

    it("should include Subreddit field", () => {
      expect(redditTemplate.fields.Subreddit).toBeDefined();
    });
  });

  describe("Wikipedia template", () => {
    it("should match Wikipedia article URLs", () => {
      expect(
        matchesDomainPattern(
          "https://en.wikipedia.org/wiki/Test_Article",
          wikipediaTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should match other language Wikipedias", () => {
      expect(
        matchesDomainPattern(
          "https://de.wikipedia.org/wiki/Test_Artikel",
          wikipediaTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should use #reference supertag", () => {
      expect(wikipediaTemplate.supertag).toBe("#reference");
    });
  });

  describe("Stack Overflow template", () => {
    it("should match SO question URLs", () => {
      expect(
        matchesDomainPattern(
          "https://stackoverflow.com/questions/123/how-to-do-something",
          stackOverflowTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should have content template for selection", () => {
      expect(stackOverflowTemplate.contentTemplate).toBe(
        "{{selection|default:''}}",
      );
    });
  });

  describe("Generic Article template", () => {
    it("should match any URL", () => {
      expect(
        matchesDomainPattern(
          "https://random-blog.com/some-article",
          genericArticleTemplate.triggers[0],
        ),
      ).toBe(true);
    });

    it("should be last in priority", () => {
      const lastIndex = builtinTemplates.length - 1;
      expect(builtinTemplates[lastIndex]).toBe(genericArticleTemplate);
    });

    it("should use #article supertag", () => {
      expect(genericArticleTemplate.supertag).toBe("#article");
    });
  });
});
