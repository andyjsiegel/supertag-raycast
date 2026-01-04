---
feature: "Schema Cache for Raycast Performance"
spec: "./spec.md"
status: "draft"
---

# Technical Plan: Schema Cache for Raycast Performance

## Architecture Overview

Extend the existing schema-registry.json file generation in supertag-cli to include target supertag metadata, then create a lightweight file-based cache reader in Raycast that bypasses CLI spawning entirely.

**Key Insight**: The infrastructure already exists - we just need to enhance the SchemaRegistry to include target supertag info and read it directly in Raycast.

```
┌──────────────────────────────────────────────────────────────┐
│  Tana Export                                                  │
│  └─ M9rkJkwuED@2026-01-04.json                              │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│  supertag sync index                                          │
│  ├─ Index to SQLite (supertag_fields table)                 │
│  │  └─ Includes target_supertag_id, target_supertag_name   │
│  └─ Generate enhanced schema-registry.json                   │
│     └─ UnifiedSchemaService.toSchemaRegistryJSON()          │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│  schema-registry.json (Enhanced)                              │
│  ~/.local/share/supertag/workspaces/main/                   │
│  {                                                            │
│    "person": {                                                │
│      "id": "YJOJebjABK",                                     │
│      "name": "person",                                        │
│      "fields": [{                                             │
│        "name": "Company",                                     │
│        "attributeId": "gmI-uZwvACY9",                        │
│        "dataType": "reference",                              │
│        "targetSupertag": {          ← NEW                   │
│          "id": "SttpRYr2Fsq_",                               │
│          "name": "company"                                    │
│        }                                                      │
│      }]                                                       │
│    }                                                          │
│  }                                                            │
└────────────┬─────────────────────────────────────────────────┘
             │
             ├─────────────────────┬─────────────────────────┐
             │ BEFORE (200-500ms)  │ AFTER (<10ms)           │
             │                     │                         │
             ▼                     ▼                         │
      ┌─────────────────┐   ┌────────────────────────┐      │
      │  Raycast        │   │  Raycast               │      │
      │  ├─ spawn CLI   │   │  ├─ SchemaCache class  │      │
      │  ├─ wait for DB │   │  │  ├─ readFileSync()  │      │
      │  ├─ parse JSON  │   │  │  ├─ JSON.parse()    │      │
      │  └─ render form │   │  │  └─ cache in RAM    │      │
      │                 │   │  └─ render form        │      │
      │  ~300ms         │   │  ~5ms                  │      │
      └─────────────────┘   └────────────────────────┘      │
```

**Performance gain**: File read (5ms) + JSON parse (2ms) vs CLI spawn (100ms) + DB query (50ms) + IPC (50ms) = **28x faster**

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | PAI standard, type safety for schema contracts |
| Runtime (CLI) | Bun | PAI standard, existing infrastructure |
| Runtime (Raycast) | Node.js | Raycast requirement (no control) |
| File Format | JSON | Human-readable, existing format, zero parsing overhead |
| Cache Strategy | mtime-based | Simple, reliable, no polling overhead |
| Storage | Filesystem | Direct file read, no IPC, no database locks |

## Constitutional Compliance

- [x] **CLI-First:** The `supertag sync` command generates the schema file. No new CLI needed - extends existing sync.
- [x] **Library-First:** SchemaCache is a reusable class that can be imported anywhere. No Raycast coupling.
- [x] **Test-First:** TDD strategy:
  - Unit tests for SchemaCache (file reading, caching, invalidation)
  - Unit tests for UnifiedSchemaService enhancement (target supertag export)
  - Integration test: sync → read → verify target supertags
  - E2E test: Raycast form load time measurement
- [x] **Deterministic:** Pure functions, no LLM calls, no probabilistic behavior. File read is deterministic.
- [x] **Code Before Prompts:** All logic in TypeScript. Zero prompt engineering.

## Data Model

### Enhanced FieldSchema (supertag-cli)

```typescript
// src/schema/registry.ts
export interface FieldSchema {
  attributeId: string;
  name: string;
  normalizedName: string;
  description?: string;
  dataType?: 'text' | 'date' | 'reference' | 'url' | 'number' | 'checkbox';

  // NEW: Target supertag for reference fields
  targetSupertag?: {
    id: string;      // Target supertag ID (e.g., "SttpRYr2Fsq_")
    name: string;    // Target supertag name (e.g., "company")
  } | null;
}
```

### CachedSupertag (Raycast)

```typescript
// kai-raycast/src/lib/schema-cache.ts
export interface CachedSupertag {
  id: string;
  name: string;
  fields: CachedField[];
}

export interface CachedField {
  name: string;
  attributeId: string;
  dataType: string;
  targetSupertag?: {
    id: string;
    name: string;
  };
}
```

### No Database Schema Changes

This feature uses existing database tables. The `supertag_fields` table already has `target_supertag_id` and `target_supertag_name` columns (added in Spec 077).

## API Contracts

### Internal APIs (supertag-cli)

```typescript
// UnifiedSchemaService enhancement
class UnifiedSchemaService {
  /**
   * Convert database supertag metadata to SchemaRegistry JSON format
   * ENHANCED: Include target supertag metadata
   */
  toSchemaRegistryJSON(): string;
}
```

### Internal APIs (Raycast)

```typescript
// SchemaCache class
class SchemaCache {
  constructor(workspace?: string);

  /**
   * Get supertag schema from cache or file
   * Returns null if not found
   */
  getSupertag(tagName: string): CachedSupertag | null;

  /**
   * Get all supertags (for list view)
   * Used in supertag selection screen
   */
  getAllSupertags(): CachedSupertag[];

  /**
   * Check if file changed and reload if needed
   * Called automatically before each access
   */
  private refreshIfNeeded(): void;

  /**
   * Load schemas from file into memory
   * Called on first access and after file changes
   */
  private loadSchemas(): void;
}
```

## Implementation Strategy

### Phase 1: Foundation (supertag-cli)

Enhance schema generation to include target supertag metadata.

- [T] Write test: toSchemaRegistryJSON() includes targetSupertag field
- [T] Update UnifiedSchemaService.toSchemaRegistryJSON() to read target supertag columns
- [T] Update FieldSchema interface to include targetSupertag property
- [T] Verify sync generates enhanced schema-registry.json
- [T] Test backward compatibility (old schemas still work)

**Files Modified**:
- `src/schema/registry.ts` - Add targetSupertag to FieldSchema interface
- `src/services/unified-schema-service.ts` - Include target supertag in JSON export
- `tests/services/unified-schema-service.test.ts` - Test enhancement

### Phase 2: Core Features (Raycast)

Implement file-based cache reader.

- [T] Write test: SchemaCache loads file and parses JSON
- [T] Write test: SchemaCache.getSupertag() returns correct schema
- [T] Write test: Cache invalidates on file mtime change
- [T] Write test: In-memory cache avoids re-reading file
- [T] Implement SchemaCache class
- [T] Implement mtime-based refresh logic
- [T] Handle missing file gracefully (return null)
- [T] Handle corrupted JSON gracefully (log error, return null)

**Files Created**:
- `kai-raycast/src/lib/schema-cache.ts` - Main implementation
- `kai-raycast/src/lib/__tests__/schema-cache.test.ts` - Unit tests

### Phase 3: Integration (Raycast)

Wire cache into form loading logic.

- [T] Update NodeForm component to try SchemaCache first
- [T] Implement fallback to CLI if cache returns null
- [T] Update field loading to use cached targetSupertag
- [T] Remove extractSupertagFromFieldName() fallback (already done in Spec 077)
- [T] Measure and log cache hit rate
- [T] Test with real schema-registry.json file
- [T] E2E test: measure form load time

**Files Modified**:
- `kai-raycast/src/create-tana-node.tsx` - Use SchemaCache in form
- `kai-raycast/src/lib/cli.ts` - Keep as fallback

### Phase 4: Validation & Deployment

- [P] Run full test suite in both repos
- [P] Performance test: measure 95th percentile form load time
- [P] Backward compatibility test: old CLI + new Raycast
- [P] Forward compatibility test: new CLI + old Raycast
- [P] Deploy supertag-cli first (generates enhanced schema)
- [P] Wait 24h for users to sync
- [P] Deploy Raycast update (uses cached schema)

## File Structure

### supertag-cli

```
src/
├── schema/
│   └── registry.ts                    # [Modified] Add targetSupertag to FieldSchema
├── services/
│   └── unified-schema-service.ts      # [Modified] Export target supertag in JSON
└── types/
    └── index.ts                       # [Modified] Export enhanced types

tests/
└── services/
    └── unified-schema-service.test.ts # [Modified] Test target supertag export
```

### kai-raycast

```
src/
├── lib/
│   ├── schema-cache.ts                # [New] Main cache implementation
│   └── __tests__/
│       └── schema-cache.test.ts       # [New] Unit tests
└── create-tana-node.tsx               # [Modified] Use cache instead of CLI

package.json                            # [Modified] Update dependencies if needed
```

**Total Changes**:
- New files: 2 (schema-cache.ts, test file)
- Modified files: 4 (registry.ts, unified-schema-service.ts, create-tana-node.tsx, test)

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Stale cache if user forgets to sync | Medium | Low | Document sync requirement, consider adding "last sync" indicator in Raycast |
| Schema file corruption | High | Very Low | Try-catch with fallback to CLI, validate JSON structure |
| File read permissions | High | Very Low | Check file existence and permissions, clear error message |
| Breaking schema format changes | High | Low | Version field in schema, gradual migration, backward compatibility tests |
| Performance regression on slow disks | Medium | Low | Cache in memory after first read, refresh only on mtime change |
| Race condition during sync | Low | Medium | Raycast holds stale cache during sync, refreshes after (acceptable) |

## Dependencies

### External (supertag-cli)

None - uses existing dependencies.

### External (Raycast)

None - uses Node.js built-ins only:
- `fs` - readFileSync, existsSync, statSync
- `path` - join
- `os` - homedir

### Internal (supertag-cli)

- `UnifiedSchemaService` - Existing service that queries database
- `SchemaRegistry` - Existing registry class for schema management

### Internal (Raycast)

- `cli.ts` - Existing CLI wrapper (kept as fallback)
- `create-tana-node.tsx` - Form component to update

## Migration/Deployment

### Phase 1: Deploy supertag-cli Enhancement

1. Update supertag-cli to v1.5.0 with enhanced schema generation
2. Users run `supertag sync index` to generate enhanced schema-registry.json
3. Backward compatible - old Raycast continues to work (uses CLI fallback)

**Breaking changes**: None

### Phase 2: Deploy Raycast Enhancement (24h later)

1. Update Raycast to use SchemaCache
2. Users update via Raycast extension store
3. Automatically uses cached schema if available
4. Falls back to CLI if schema file missing or old format

**Breaking changes**: None

### Rollback Strategy

If issues arise:
1. Raycast automatically falls back to CLI if cache fails
2. Can revert Raycast to previous version without touching supertag-cli
3. Can revert supertag-cli without affecting Raycast (uses fallback)

### Environment Variables

None required - uses default paths:
- Schema file: `~/.local/share/supertag/workspaces/<workspace>/schema-registry.json`

### Configuration

Optional (for advanced users):
- `SUPERTAG_WORKSPACE` - Override workspace selection
- Default: "main"

## Estimated Complexity

- **New files:** 2 (SchemaCache + test)
- **Modified files:** 4 (registry, service, form, test)
- **Test files:** 2 (1 new, 1 modified)
- **Estimated tasks:** 15 tasks across 4 phases
- **Estimated effort:** 4-6 hours total
  - Phase 1 (CLI): 1-2 hours
  - Phase 2 (Cache): 1-2 hours
  - Phase 3 (Integration): 1 hour
  - Phase 4 (Validation): 1 hour

## Performance Targets

| Metric | Before | Target | Success Criteria |
|--------|--------|--------|------------------|
| Form render (p50) | 300ms | <5ms | 60x improvement |
| Form render (p95) | 500ms | <10ms | 50x improvement |
| Cache lookup | N/A | <1ms | File read + parse |
| Memory cache hit | N/A | <0.1ms | Map lookup |
| Cache hit rate | 0% | >90% | Track in logs |

## Testing Strategy

### Unit Tests

**supertag-cli**:
- `toSchemaRegistryJSON()` includes target supertag metadata
- Backward compatibility with old schema format
- Null handling for fields without target supertags

**Raycast**:
- SchemaCache file reading and parsing
- mtime-based cache invalidation
- In-memory cache hit detection
- Graceful handling of missing/corrupted files

### Integration Tests

- **End-to-end flow**: Sync → generate schema → read in Raycast → verify fields
- **Backward compatibility**: Old schema format works with new code
- **Forward compatibility**: New schema works with fallback logic

### Performance Tests

- Measure form load time with cache vs CLI
- Verify <10ms target for cached lookups
- Measure cache hit rate over 100 form opens

### Manual Testing

1. Run `supertag sync index`
2. Verify schema-registry.json contains targetSupertag fields
3. Open Raycast, create node with reference field
4. Verify dropdown shows correct target supertag options
5. Modify schema-registry.json, verify cache refreshes
6. Delete schema file, verify fallback to CLI works
