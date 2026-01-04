---
id: "081"
feature: "Schema Cache for Raycast Performance"
status: "draft"
created: "2026-01-04"
---

# Specification: Schema Cache for Raycast Performance

## Overview

Eliminate CLI process spawning overhead in Raycast by caching supertag schema definitions in a file that can be read directly. This improves form rendering performance from 200-500ms to <10ms by extending the existing schema-registry.json to include target supertag metadata and providing a file-based cache reader.

**Why this matters**: Every time a user creates a Tana node in Raycast, the extension currently spawns a CLI process to fetch the supertag schema. This creates noticeable UI lag and poor user experience. Since supertag definitions rarely change (only when user modifies fields in Tana), they are ideal for caching.

## User Scenarios

### Scenario 1: Fast Node Creation

**As a** Raycast user creating Tana nodes
**I want to** see the form fields appear instantly when I select a supertag
**So that** I can quickly capture information without waiting for the UI to load

**Acceptance Criteria:**
- [ ] Form appears in <10ms after supertag selection
- [ ] All fields are present with correct types (text, date, reference, etc.)
- [ ] Reference fields show correct target supertag names
- [ ] No visible loading spinner or delay

### Scenario 2: Up-to-Date Schema After Sync

**As a** user who just ran `supertag sync index`
**I want to** see updated field definitions immediately in Raycast
**So that** new fields I added in Tana are available for node creation

**Acceptance Criteria:**
- [ ] Schema cache refreshes automatically when schema-registry.json changes
- [ ] No manual cache clearing required
- [ ] Changes appear within 1 second of sync completion

### Scenario 3: Graceful Degradation

**As a** user with an outdated supertag-cli version
**I want to** Raycast to continue working even without the enhanced schema file
**So that** I'm not forced to upgrade immediately

**Acceptance Criteria:**
- [ ] Raycast detects missing/old schema format
- [ ] Falls back to CLI-based schema loading
- [ ] No error messages or broken functionality
- [ ] Performance degrades gracefully (slower but still works)

### Scenario 4: Offline Schema Access

**As a** user working while supertag-cli is busy (e.g., running sync)
**I want to** still be able to create nodes in Raycast
**So that** I'm not blocked by database locks or busy processes

**Acceptance Criteria:**
- [ ] Schema cache works independently of CLI availability
- [ ] No "database is locked" errors
- [ ] Node creation succeeds using cached schema

## Functional Requirements

### FR-1: Enhanced Schema Registry Format

The schema-registry.json file must include target supertag metadata for reference fields.

**Validation:**
- Open schema-registry.json and verify each reference field has a `targetSupertag` object with `id` and `name` properties
- Verify backward compatibility: old schema readers ignore unknown fields

### FR-2: Schema Registry Generation

The `supertag sync index` command must generate an enhanced schema-registry.json with target supertag data.

**Validation:**
- Run `supertag sync index`
- Verify schema-registry.json contains target supertag metadata
- Verify file is written to `~/.local/share/supertag/workspaces/<workspace>/schema-registry.json`

### FR-3: File-Based Cache Reader

Raycast must be able to read and parse schema-registry.json directly without CLI spawning.

**Validation:**
- Measure file read time (should be <1ms)
- Verify schema data is correctly parsed
- Verify all field attributes are accessible (name, type, target supertag)

### FR-4: Automatic Cache Invalidation

The cache must automatically refresh when schema-registry.json is modified.

**Validation:**
- Modify schema-registry.json file
- Open Raycast form for a supertag
- Verify it uses the new schema data (not stale cache)
- Verify refresh happens via file mtime check, not polling

### FR-5: In-Memory Cache

After initial file read, subsequent supertag lookups must use in-memory cache.

**Validation:**
- Access same supertag twice
- Verify second access doesn't re-read file (check file access count)
- Verify lookup time is <0.1ms for cached entries

### FR-6: Backward Compatibility

Raycast must continue working with older supertag-cli versions that don't include target supertag metadata.

**Validation:**
- Test with old schema-registry.json format (without targetSupertag field)
- Verify Raycast doesn't crash or show errors
- Verify fields still appear (using fallback logic)

## Non-Functional Requirements

- **Performance:**
  - Form rendering: <10ms from supertag selection to form display (vs current 200-500ms)
  - Cache lookup: <1ms for file read, <0.1ms for memory lookup
  - Cache refresh: <5ms when file changes

- **Reliability:**
  - Cache must never return corrupted or invalid schema data
  - File read errors must fall back to CLI gracefully
  - No data loss if cache is corrupted or missing

- **Compatibility:**
  - Must work with schema-registry.json versions from last 6 months
  - Must not break existing Raycast installations
  - Must not require supertag-cli upgrade for basic functionality

- **Maintainability:**
  - Cache invalidation logic must be simple and predictable
  - No manual cache clearing commands needed
  - File format must be forward-compatible (additive changes only)

## Key Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| SchemaCache | In-memory cache of supertag schemas | cache Map, schemaPath, lastModified timestamp |
| CachedSupertag | Schema definition for a single supertag | id, name, fields array |
| CachedField | Field definition with target supertag metadata | name, attributeId, dataType, targetSupertag object |
| SchemaRegistry | Enhanced schema file on disk | JSON format, workspace-specific path |

## Success Criteria

- [ ] **Performance**: 95th percentile form render time <10ms (measured in production)
- [ ] **Adoption**: 90%+ of form renders use cache (not CLI fallback)
- [ ] **Reliability**: Zero cache-related errors in first week after deployment
- [ ] **Compatibility**: Zero breaking changes reported by existing users
- [ ] **User Experience**: No user-reported slowness in Raycast form loading

## Assumptions

- Schema-registry.json file exists and is accessible by Raycast
- File system is reasonably fast (SSD or better)
- Schema changes are infrequent (hourly or less)
- Users run `supertag sync index` to update schemas
- Raycast has read permissions for ~/.local/share/supertag/

## Out of Scope

- Real-time schema synchronization (watching Tana for changes)
- Schema caching for other clients (only Raycast)
- Schema versioning or migration tools
- Compression of schema-registry.json file
- Network-based schema distribution
- Schema diff or change notifications
- Automatic sync triggering from Raycast
- Field options caching (separate feature, different access patterns)
