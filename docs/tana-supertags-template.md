# Tana Supertags for Web Clipper

This document describes the supertags used by the KAI Raycast Web Clipper extension. Create these supertags in your Tana workspace to enable seamless web clipping.

## Quick Start

Import these supertags into Tana, and the Web Clipper will automatically populate fields when you clip pages from supported sites.

---

## Common Fields (All Supertags)

These fields are recommended for ALL clip-related supertags:

| Field | Type | Description |
|-------|------|-------------|
| **URL** | URL | The source URL (required for all clips) |
| **Clipped** | Date | Date when the page was clipped (auto-populated) |

---

## Supertag Definitions

### #article

**Used for:** Medium articles, blog posts, and any generic web page

**Matched URLs:**
- `medium.com/*`
- `*.medium.com/*`
- Any URL (fallback)

| Field | Type | Description |
|-------|------|-------------|
| URL | URL | Source URL |
| Author | Plain text | Article author |
| Description | Plain text | Article summary/excerpt (truncated to 200 chars) |
| Reading Time | Plain text | Estimated reading time (e.g., "5 min") |
| Clipped | Date | Clip date |

---

### #repository

**Used for:** GitHub repositories

**Matched URLs:**
- `github.com/*/*` (e.g., github.com/anthropics/claude-code)

| Field | Type | Description |
|-------|------|-------------|
| URL | URL | Repository URL |
| Description | Plain text | Repository description |
| Author | Plain text | Repository owner/organization |
| Clipped | Date | Clip date |

---

### #issue

**Used for:** GitHub issues and pull requests

**Matched URLs:**
- `github.com/*/*/issues/*`
- `github.com/*/*/pull/*`

| Field | Type | Description |
|-------|------|-------------|
| URL | URL | Issue/PR URL |
| Title | Plain text | Issue/PR title |
| Description | Plain text | Issue/PR description (truncated to 300 chars) |
| Clipped | Date | Clip date |

---

### #video

**Used for:** YouTube videos and shorts

**Matched URLs:**
- `youtube.com/watch*`
- `youtu.be/*`
- `youtube.com/shorts/*`

| Field | Type | Description |
|-------|------|-------------|
| URL | URL | Video URL |
| Channel | Plain text | YouTube channel name |
| Description | Plain text | Video description (truncated to 200 chars) |
| Clipped | Date | Clip date |

---

### #tweet

**Used for:** Twitter/X posts

**Matched URLs:**
- `twitter.com/*/status/*`
- `x.com/*/status/*`
- `mobile.twitter.com/*/status/*`

| Field | Type | Description |
|-------|------|-------------|
| URL | URL | Tweet URL |
| Author | Plain text | Twitter handle (when available) |
| Clipped | Date | Clip date |

**Note:** Tweet content is saved as a child node (not a field) when text is selected.

---

### #discussion

**Used for:** Hacker News and Reddit posts

**Matched URLs:**
- `news.ycombinator.com/item*`
- `reddit.com/r/*/comments/*`
- `old.reddit.com/r/*/comments/*`

| Field | Type | Description |
|-------|------|-------------|
| URL | URL | Discussion URL |
| Title | Plain text | Post title |
| Subreddit | Plain text | Subreddit name (Reddit only) |
| Clipped | Date | Clip date |

---

### #reference

**Used for:** Wikipedia articles

**Matched URLs:**
- `*.wikipedia.org/wiki/*`

| Field | Type | Description |
|-------|------|-------------|
| URL | URL | Wikipedia URL |
| Title | Plain text | Article title |
| Description | Plain text | Article summary (truncated to 300 chars) |
| Clipped | Date | Clip date |

---

### #question

**Used for:** Stack Overflow questions

**Matched URLs:**
- `stackoverflow.com/questions/*`

| Field | Type | Description |
|-------|------|-------------|
| URL | URL | Question URL |
| Title | Plain text | Question title |
| Clipped | Date | Clip date |

**Note:** Selected code/text is saved as a child node.

---

## Tana Paste Template

Copy this Tana Paste into Tana to create all supertags at once:

```
%%tana%%
- #article
  - URL:: url
  - Author:: plain
  - Description:: plain
  - Reading Time:: plain
  - Clipped:: date

- #repository
  - URL:: url
  - Description:: plain
  - Author:: plain
  - Clipped:: date

- #issue
  - URL:: url
  - Title:: plain
  - Description:: plain
  - Clipped:: date

- #video
  - URL:: url
  - Channel:: plain
  - Description:: plain
  - Clipped:: date

- #tweet
  - URL:: url
  - Author:: plain
  - Clipped:: date

- #discussion
  - URL:: url
  - Title:: plain
  - Subreddit:: plain
  - Clipped:: date

- #reference
  - URL:: url
  - Title:: plain
  - Description:: plain
  - Clipped:: date

- #question
  - URL:: url
  - Title:: plain
  - Clipped:: date
```

---

## Field Type Reference

| Tana Type | Used For |
|-----------|----------|
| `url` | Links that should be clickable |
| `plain` | Short text content |
| `date` | Date values (YYYY-MM-DD format) |

---

## How Content is Saved

The Web Clipper saves content in two ways:

1. **Fields**: Metadata like URL, Author, Description goes into supertag fields
2. **Children**: Article content, highlights, and selections are saved as child nodes

When you enable "Extract Full Article", the markdown content is parsed and:
- Headlines become parent nodes
- Paragraphs are nested under their headlines
- Content is truncated at ~4500 chars to stay within Tana's API limits

---

## Smart Field Mapping

The extension automatically maps template fields to your existing supertag fields using semantic matching. This means you don't need to rename your fields to match the template exactly.

**Example mappings:**
| Template Field | Will Match |
|----------------|------------|
| `Channel` | Channel, Author, Creator, By |
| `Description` | Description, Summary, Excerpt, About |
| `URL` | URL, Link, Source, Href |
| `Clipped` | Clipped, Date, Added, Created, Saved |
| `Reading Time` | Reading Time, Duration, Length, Time |
| `Site` | Site, Source, Website, Domain |

So if your `#video` supertag has an `Author` field instead of `Channel`, the YouTube template will automatically use your `Author` field.

---

## Customization

The builtin templates work with the supertag names above. If your Tana workspace uses different names (e.g., `#bookmark` instead of `#article`), you can:

1. **Override per-clip**: Select a different supertag in the dropdown
2. **Domain memory**: The extension remembers your supertag choice per domain
3. **Smart mapping**: Fields are automatically mapped to your existing schema (see above)
