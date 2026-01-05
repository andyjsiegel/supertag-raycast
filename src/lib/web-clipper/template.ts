/**
 * Template Engine for Web Clipper
 *
 * Renders templates with variable substitution and filter support.
 * Variables use mustache-style syntax: {{variable}} or {{variable|filter:arg}}
 */

import type {
  ClipTemplate,
  TemplateContext,
  RenderedTemplate,
  FilterRegistry,
} from "./template-types";
import { defaultFilters, applyFilters } from "./filters";

/**
 * Regex to match template variables: {{name}} or {{name|filter:arg|filter2}}
 */
const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * Parse a variable expression like "title|truncate:50|upper"
 * @returns [variableName, filterExpressions[]]
 */
function parseVariableExpression(expr: string): [string, string[]] {
  const parts = expr.split("|").map((p) => p.trim());
  const variableName = parts[0];
  const filters = parts.slice(1);
  return [variableName, filters];
}

/**
 * Get a value from the context by variable name
 * Supports nested access via dot notation (e.g., "meta.language")
 */
function getContextValue(
  context: TemplateContext,
  variableName: string,
): string {
  // Handle special cases
  if (variableName === "keypoints" && Array.isArray(context.keypoints)) {
    return JSON.stringify(context.keypoints);
  }

  // Handle dot notation for nested access
  const parts = variableName.split(".");
  let value: unknown = context;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return "";
    }
    value = (value as Record<string, unknown>)[part];
  }

  // Convert to string
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Render a single template string with variable substitution
 * @param template - Template string with {{variables}}
 * @param context - Context with variable values
 * @param filters - Filter registry to use
 * @returns Rendered string
 */
export function renderTemplateString(
  template: string,
  context: TemplateContext,
  filters: FilterRegistry = defaultFilters,
): string {
  return template.replace(VARIABLE_REGEX, (match, expr: string) => {
    const [variableName, filterExprs] = parseVariableExpression(expr);
    let value = getContextValue(context, variableName);

    // Apply filters
    if (filterExprs.length > 0) {
      value = applyFilters(value, filterExprs, filters);
    }

    return value;
  });
}

/**
 * Render a complete template
 * @param template - The template definition
 * @param context - Context with variable values
 * @param filters - Filter registry to use
 * @returns Rendered template with supertag, fields, and content
 */
export function renderTemplate(
  template: ClipTemplate,
  context: TemplateContext,
  filters: FilterRegistry = defaultFilters,
): RenderedTemplate {
  // Render supertag (in case it has variables, though usually static)
  const supertag = renderTemplateString(template.supertag, context, filters);

  // Render each field
  const fields: Record<string, string> = {};
  for (const [fieldName, fieldTemplate] of Object.entries(template.fields)) {
    const renderedValue = renderTemplateString(fieldTemplate, context, filters);
    // Only include non-empty fields
    if (renderedValue.trim()) {
      fields[fieldName] = renderedValue;
    }
  }

  // Render content template if provided
  let content: string | undefined;
  if (template.contentTemplate) {
    content = renderTemplateString(template.contentTemplate, context, filters);
    if (!content.trim()) {
      content = undefined;
    }
  }

  return {
    supertag,
    fields,
    content,
  };
}

/**
 * Check if a URL matches a domain pattern
 * Patterns support:
 * - Exact domain: "github.com"
 * - Wildcards: "*.medium.com", "github.com/star", "github.com/star/star"
 * - Path matching: "youtube.com/watchstar"
 * (where "star" means the asterisk wildcard character)
 */
export function matchesDomainPattern(url: string, pattern: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const fullPath = hostname + parsed.pathname;

    // Convert pattern to regex
    // - Escape special regex characters except *
    // - Convert * to .*
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape special chars
      .replace(/\*/g, ".*"); // Convert * to .*

    const regex = new RegExp(`^${regexPattern}$`, "i");
    return regex.test(fullPath) || regex.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Find the best matching template for a URL
 * @param url - The URL to match
 * @param templates - Available templates
 * @returns The matching template or undefined
 */
export function findMatchingTemplate(
  url: string,
  templates: ClipTemplate[],
): ClipTemplate | undefined {
  // Calculate specificity score for a pattern
  // Higher score = more specific
  const getSpecificity = (pattern: string): number => {
    // Catch-all patterns get lowest priority
    if (pattern === "*") return 0;

    // Count literal (non-wildcard) characters
    const literalChars = pattern.replace(/\*/g, "").length;

    // Count path segments (more segments = more specific)
    const segments = pattern.split("/").length;

    return literalChars * 10 + segments;
  };

  // Get max specificity across all triggers for a template
  const getTemplateSpecificity = (template: ClipTemplate): number => {
    return Math.max(...template.triggers.map(getSpecificity));
  };

  // Sort by specificity (higher = more specific = first)
  const sortedTemplates = [...templates].sort((a, b) => {
    return getTemplateSpecificity(b) - getTemplateSpecificity(a);
  });

  for (const template of sortedTemplates) {
    for (const trigger of template.triggers) {
      if (matchesDomainPattern(url, trigger)) {
        return template;
      }
    }
  }

  return undefined;
}

/**
 * Create a template context from clip data
 */
export function createTemplateContext(data: {
  url: string;
  title: string;
  selection?: string;
  content?: string;
  description?: string;
  author?: string;
  image?: string;
  siteName?: string;
  readtime?: number;
  summary?: string;
  keypoints?: string[];
}): TemplateContext {
  // Extract domain from URL
  let domain = "";
  try {
    domain = new URL(data.url).hostname.replace(/^www\./, "");
  } catch {
    domain = data.url;
  }

  return {
    title: data.title,
    url: data.url,
    domain,
    date: new Date().toISOString(),
    selection: data.selection,
    content: data.content,
    description: data.description,
    author: data.author,
    image: data.image,
    siteName: data.siteName,
    readtime: data.readtime,
    summary: data.summary,
    keypoints: data.keypoints,
  };
}

/**
 * Validate a template definition
 * @returns Array of validation errors (empty if valid)
 */
export function validateTemplate(template: Partial<ClipTemplate>): string[] {
  const errors: string[] = [];

  if (!template.id || template.id.trim() === "") {
    errors.push("Template ID is required");
  }

  if (!template.name || template.name.trim() === "") {
    errors.push("Template name is required");
  }

  if (!template.triggers || template.triggers.length === 0) {
    errors.push("At least one trigger pattern is required");
  }

  if (!template.supertag || template.supertag.trim() === "") {
    errors.push("Supertag is required");
  }

  if (!template.fields || Object.keys(template.fields).length === 0) {
    errors.push("At least one field mapping is required");
  }

  return errors;
}
