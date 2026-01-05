/**
 * Builtin Templates for Web Clipper
 *
 * Pre-configured templates for common websites.
 * These templates are read-only and cannot be modified by users.
 */

import type { ClipTemplate } from "./template-types";

/**
 * GitHub Repository template
 */
export const githubRepoTemplate: ClipTemplate = {
  id: "builtin:github-repo",
  name: "GitHub Repository",
  description: "Clip GitHub repositories with stars, language, and description",
  triggers: ["github.com/*/*"],
  supertag: "#repository",
  fields: {
    URL: "{{url}}",
    Description: "{{description|default:''}}",
    Author: "{{author|default:''}}",
  },
  isBuiltin: true,
};

/**
 * GitHub Issue/PR template
 */
export const githubIssueTemplate: ClipTemplate = {
  id: "builtin:github-issue",
  name: "GitHub Issue/PR",
  description: "Clip GitHub issues and pull requests",
  triggers: ["github.com/*/*/issues/*", "github.com/*/*/pull/*"],
  supertag: "#issue",
  fields: {
    URL: "{{url}}",
    Title: "{{title}}",
    Description: "{{description|truncate:300}}",
  },
  isBuiltin: true,
};

/**
 * YouTube Video template
 */
export const youtubeTemplate: ClipTemplate = {
  id: "builtin:youtube",
  name: "YouTube Video",
  description: "Clip YouTube videos with channel and description",
  triggers: ["youtube.com/watch*", "youtu.be/*", "youtube.com/shorts/*"],
  supertag: "#video",
  fields: {
    URL: "{{url}}",
    Channel: "{{author|default:''}}",
    Description: "{{description|truncate:200}}",
  },
  isBuiltin: true,
};

/**
 * Twitter/X Post template
 */
export const twitterTemplate: ClipTemplate = {
  id: "builtin:twitter",
  name: "Twitter/X Post",
  description: "Clip tweets and X posts",
  triggers: [
    "twitter.com/*/status/*",
    "x.com/*/status/*",
    "mobile.twitter.com/*/status/*",
  ],
  supertag: "#tweet",
  fields: {
    URL: "{{url}}",
    Author: "{{author|default:''}}",
  },
  contentTemplate: "{{selection|default:description}}",
  isBuiltin: true,
};

/**
 * Medium Article template
 */
export const mediumTemplate: ClipTemplate = {
  id: "builtin:medium",
  name: "Medium Article",
  description: "Clip Medium articles with author and reading time",
  triggers: ["medium.com/*", "*.medium.com/*"],
  supertag: "#article",
  fields: {
    URL: "{{url}}",
    Author: "{{author|default:''}}",
    "Reading Time": "{{readtime|default:''}} min",
  },
  isBuiltin: true,
};

/**
 * Hacker News template
 */
export const hackerNewsTemplate: ClipTemplate = {
  id: "builtin:hackernews",
  name: "Hacker News",
  description: "Clip Hacker News discussions",
  triggers: ["news.ycombinator.com/item*"],
  supertag: "#discussion",
  fields: {
    URL: "{{url}}",
    Title: "{{title}}",
  },
  isBuiltin: true,
};

/**
 * Reddit Post template
 */
export const redditTemplate: ClipTemplate = {
  id: "builtin:reddit",
  name: "Reddit Post",
  description: "Clip Reddit posts and discussions",
  triggers: ["reddit.com/r/*/comments/*", "old.reddit.com/r/*/comments/*"],
  supertag: "#discussion",
  fields: {
    URL: "{{url}}",
    Title: "{{title}}",
    Subreddit: "{{siteName|default:''}}",
  },
  isBuiltin: true,
};

/**
 * Wikipedia Article template
 */
export const wikipediaTemplate: ClipTemplate = {
  id: "builtin:wikipedia",
  name: "Wikipedia Article",
  description: "Clip Wikipedia articles",
  triggers: ["*.wikipedia.org/wiki/*"],
  supertag: "#reference",
  fields: {
    URL: "{{url}}",
    Title: "{{title}}",
    Description: "{{description|truncate:300}}",
  },
  isBuiltin: true,
};

/**
 * Stack Overflow template
 */
export const stackOverflowTemplate: ClipTemplate = {
  id: "builtin:stackoverflow",
  name: "Stack Overflow",
  description: "Clip Stack Overflow questions",
  triggers: ["stackoverflow.com/questions/*"],
  supertag: "#question",
  fields: {
    URL: "{{url}}",
    Title: "{{title}}",
  },
  contentTemplate: "{{selection|default:''}}",
  isBuiltin: true,
};

/**
 * Generic Article template (lowest priority)
 */
export const genericArticleTemplate: ClipTemplate = {
  id: "builtin:article",
  name: "Generic Article",
  description: "Default template for articles and blog posts",
  triggers: ["*"], // Matches any URL - lowest priority
  supertag: "#article",
  fields: {
    URL: "{{url}}",
    Author: "{{author|default:''}}",
    Description: "{{description|truncate:200}}",
  },
  isBuiltin: true,
};

/**
 * All builtin templates in priority order (most specific first)
 */
export const builtinTemplates: ClipTemplate[] = [
  githubIssueTemplate, // More specific GitHub patterns first
  githubRepoTemplate,
  youtubeTemplate,
  twitterTemplate,
  mediumTemplate,
  hackerNewsTemplate,
  redditTemplate,
  wikipediaTemplate,
  stackOverflowTemplate,
  genericArticleTemplate, // Catch-all last
];

/**
 * Get a builtin template by ID
 */
export function getBuiltinTemplate(id: string): ClipTemplate | undefined {
  return builtinTemplates.find((t) => t.id === id);
}

/**
 * Check if a template ID is a builtin
 */
export function isBuiltinTemplate(id: string): boolean {
  return id.startsWith("builtin:");
}
