/**
 * Template Types for Web Clipper
 *
 * Defines the structure for clip templates with variable substitution
 * and domain-based matching.
 */

/**
 * A clip template defines how to structure a web clip for a specific type of content
 */
export interface ClipTemplate {
  /** Unique identifier (e.g., "builtin:github-repo" or "user:my-template") */
  id: string;

  /** Human-readable name */
  name: string;

  /** Domain patterns that trigger this template (e.g., "github.com/owner/repo") */
  triggers: string[];

  /** Supertag to apply (e.g., "#article", "#video") */
  supertag: string;

  /** Field mappings with template variables */
  fields: Record<string, string>;

  /** Optional template for content/children */
  contentTemplate?: string;

  /** Whether this is a builtin template (read-only) */
  isBuiltin?: boolean;

  /** Optional description for the template */
  description?: string;
}

/**
 * Context variables available for template substitution
 */
export interface TemplateContext {
  /** Page title */
  title: string;

  /** Full URL */
  url: string;

  /** Domain only (e.g., "github.com") */
  domain: string;

  /** Current date (ISO format) */
  date: string;

  /** User selection/highlight */
  selection?: string;

  /** Full article content (markdown) */
  content?: string;

  /** Page description (from meta tags) */
  description?: string;

  /** Author name */
  author?: string;

  /** OG image URL */
  image?: string;

  /** AI-generated summary */
  summary?: string;

  /** AI-extracted key points */
  keypoints?: string[];

  /** Estimated reading time in minutes */
  readtime?: number;

  /** Site name from OG tags */
  siteName?: string;

  /** Any additional custom variables */
  [key: string]: string | string[] | number | undefined;
}

/**
 * Result of rendering a template
 */
export interface RenderedTemplate {
  /** The supertag to use */
  supertag: string;

  /** Rendered field values */
  fields: Record<string, string>;

  /** Rendered content (if contentTemplate was provided) */
  content?: string;
}

/**
 * Filter function type for transforming values
 */
export type FilterFunction = (value: string, ...args: string[]) => string;

/**
 * Registry of available filters
 */
export type FilterRegistry = Record<string, FilterFunction>;
