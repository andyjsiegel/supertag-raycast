---
feature: "Schema Cache for Raycast Performance"
plan: "./plan.md"
status: "pending"
total_tasks: 18
completed: 0
---

# Tasks: Schema Cache for Raycast Performance

## Legend

- `[T]` - Test required (TDD mandatory - write test FIRST)
- `[P]` - Can run in parallel with other [P] tasks in same group
- `depends: T-X.Y` - Must complete after specified task(s)

## Task Groups

### Group 1: Foundation (supertag-cli)

Enhance schema-registry.json generation to include target supertag metadata.

- [ ] **T-1.1** Update FieldSchema interface with targetSupertag property [T] [P]
  - File: `supertag-cli/src/schema/registry.ts`
  - Test: `supertag-cli/tests/schema/registry.test.ts` (create if needed)
  - Description: Add optional `targetSupertag?: { id: string; name: string } | null` to FieldSchema interface

- [ ] **T-1.2** Write test for toSchemaRegistryJSON() target supertag export [T] [P]
  - File: `supertag-cli/tests/services/unified-schema-service.test.ts`
  - Description: Test that toSchemaRegistryJSON() includes targetSupertag field from database columns

- [ ] **T-1.3** Update UnifiedSchemaService to export target supertag [T] (depends: T-1.1, T-1.2)
  - File: `supertag-cli/src/services/unified-schema-service.ts`
  - Test: Uses test from T-1.2
  - Description: Modify toSchemaRegistryJSON() to read target_supertag_id and target_supertag_name columns and include in JSON output

- [ ] **T-1.4** Test backward compatibility with old schema format [T] (depends: T-1.3)
  - File: `supertag-cli/tests/services/unified-schema-service.test.ts`
  - Description: Verify that schema without targetSupertag field still works (null handling)

### Group 2: Core Cache Implementation (Raycast)

Create SchemaCache class for fast file-based schema lookup.

- [ ] **T-2.1** Create CachedSupertag and CachedField interfaces [T] [P]
  - File: `kai-raycast/src/lib/schema-cache.ts`
  - Test: `kai-raycast/src/lib/__tests__/schema-cache.test.ts`
  - Description: Define TypeScript interfaces matching enhanced schema-registry.json format

- [ ] **T-2.2** Test SchemaCache loads file and parses JSON [T] [P]
  - File: `kai-raycast/src/lib/__tests__/schema-cache.test.ts`
  - Description: Write test for loading schema-registry.json from filesystem

- [ ] **T-2.3** Test SchemaCache.getSupertag() returns correct schema [T] [P]
  - File: `kai-raycast/src/lib/__tests__/schema-cache.test.ts`
  - Description: Test that getSupertag("person") returns correct CachedSupertag with fields

- [ ] **T-2.4** Test cache invalidation on file mtime change [T] [P]
  - File: `kai-raycast/src/lib/__tests__/schema-cache.test.ts`
  - Description: Test that modifying schema file triggers cache refresh

- [ ] **T-2.5** Test in-memory cache avoids re-reading file [T] [P]
  - File: `kai-raycast/src/lib/__tests__/schema-cache.test.ts`
  - Description: Test that repeated calls use cached data without fs.readFileSync

- [ ] **T-2.6** Implement SchemaCache class [T] (depends: T-2.1, T-2.2, T-2.3, T-2.4, T-2.5)
  - File: `kai-raycast/src/lib/schema-cache.ts`
  - Test: Uses tests from T-2.2 through T-2.5
  - Description: Implement constructor, loadSchemas(), refreshIfNeeded(), getSupertag(), getAllSupertags()

- [ ] **T-2.7** Test missing file graceful handling [T] (depends: T-2.6)
  - File: `kai-raycast/src/lib/__tests__/schema-cache.test.ts`
  - Description: Test that missing schema-registry.json returns null, not crash

- [ ] **T-2.8** Test corrupted JSON graceful handling [T] (depends: T-2.6)
  - File: `kai-raycast/src/lib/__tests__/schema-cache.test.ts`
  - Description: Test that invalid JSON logs error and returns null

### Group 3: Integration (Raycast)

Wire SchemaCache into Raycast form loading.

- [ ] **T-3.1** Update NodeForm to try SchemaCache first [T] (depends: T-2.6)
  - File: `kai-raycast/src/create-tana-node.tsx`
  - Test: Manual testing (Raycast E2E)
  - Description: Create SchemaCache instance and attempt to load schema before CLI spawn

- [ ] **T-3.2** Implement fallback to CLI if cache returns null [T] (depends: T-3.1)
  - File: `kai-raycast/src/create-tana-node.tsx`
  - Test: Manual testing (delete schema file and verify fallback works)
  - Description: Keep existing CLI code path as fallback when SchemaCache returns null

- [ ] **T-3.3** Update field loading to use cached targetSupertag [T] (depends: T-3.1)
  - File: `kai-raycast/src/create-tana-node.tsx`
  - Test: Manual testing (create person with Company field)
  - Description: Use field.targetSupertag.name from cache for reference field options

- [ ] **T-3.4** Add cache hit rate logging [T] (depends: T-3.1, T-3.2)
  - File: `kai-raycast/src/create-tana-node.tsx`
  - Test: Check console output during development
  - Description: Log whether schema was loaded from cache or CLI fallback (dev mode only)

### Group 4: Testing & Deployment

Validation, performance testing, and documentation.

- [ ] **T-4.1** Run full test suite in supertag-cli [P]
  - Command: `cd supertag-cli && bun test`
  - Description: Verify all existing tests pass with schema changes

- [ ] **T-4.2** Run full test suite in kai-raycast [P]
  - Command: `cd kai-raycast && npm test` (if tests exist)
  - Description: Verify all existing tests pass with SchemaCache

- [ ] **T-4.3** Manual E2E test: measure form load time [P]
  - File: Manual testing in Raycast
  - Description: Open Raycast, create node, log time from command trigger to form render. Target: <10ms for cached path

- [ ] **T-4.4** Update documentation and changelog
  - Files: `supertag-cli/CHANGELOG.md`, `kai-raycast/CHANGELOG.md`, `kai-raycast/README.md`
  - Description: Document schema cache feature, performance improvements, and usage

## Dependency Graph

```
Group 1 (supertag-cli):
T-1.1 ──┬──> T-1.3 ──> T-1.4
T-1.2 ──┘

Group 2 (kai-raycast):
T-2.1 ──┬
T-2.2 ──┤
T-2.3 ──┼──> T-2.6 ──┬──> T-2.7
T-2.4 ──┤             └──> T-2.8
T-2.5 ──┘

Group 3 (kai-raycast):
T-2.6 ──> T-3.1 ──┬──> T-3.2
                  ├──> T-3.3
                  └──> T-3.4

Group 4 (both repos):
T-1.4 ──┬──> T-4.1 ──┬
T-3.4 ──┼──> T-4.2 ──┼──> T-4.3 ──> T-4.4
        └──> T-4.3 ──┘
```

## Execution Order

**Batch 1 (Parallel):** T-1.1, T-1.2
**Sequential:** T-1.3 → T-1.4

**Batch 2 (Parallel):** T-2.1, T-2.2, T-2.3, T-2.4, T-2.5
**Sequential:** T-2.6 → T-2.7, T-2.8 (parallel)

**Sequential:** T-3.1 → T-3.2, T-3.3, T-3.4 (parallel)

**Batch 3 (Parallel):** T-4.1, T-4.2, T-4.3
**Sequential:** T-4.4

## Progress Tracking

| Task | Status | Started | Completed | Notes |
|------|--------|---------|-----------|-------|
| T-1.1 | pending | - | - | |
| T-1.2 | pending | - | - | |
| T-1.3 | pending | - | - | |
| T-1.4 | pending | - | - | |
| T-2.1 | pending | - | - | |
| T-2.2 | pending | - | - | |
| T-2.3 | pending | - | - | |
| T-2.4 | pending | - | - | |
| T-2.5 | pending | - | - | |
| T-2.6 | pending | - | - | |
| T-2.7 | pending | - | - | |
| T-2.8 | pending | - | - | |
| T-3.1 | pending | - | - | |
| T-3.2 | pending | - | - | |
| T-3.3 | pending | - | - | |
| T-3.4 | pending | - | - | |
| T-4.1 | pending | - | - | |
| T-4.2 | pending | - | - | |
| T-4.3 | pending | - | - | |
| T-4.4 | pending | - | - | |

## TDD Reminder

For each task marked [T]:

1. **RED:** Write failing test first
2. **GREEN:** Write minimal implementation to pass
3. **FULL SUITE:** Run full test suite (`bun test`)
4. **BLUE:** Refactor while keeping tests green

**DO NOT proceed to next task until:**
- Current task's tests pass
- Full test suite passes (no regressions)

## Blockers & Issues

[Track any blockers discovered during implementation]

| Task | Issue | Resolution |
|------|-------|------------|
| - | - | - |

## Performance Targets

| Metric | Current | Target | Test Method |
|--------|---------|--------|-------------|
| Form render (p95) | ~500ms | <10ms | T-4.3 manual timing |
| Cache lookup | N/A | <1ms | Unit test timing |
| Cache hit rate | 0% | >90% | T-3.4 logging over 100 opens |

## Notes

- **Two repositories**: Tasks span both supertag-cli (Group 1) and kai-raycast (Groups 2-4)
- **Deploy order**: supertag-cli first, then kai-raycast after users sync
- **Backward compatible**: Raycast falls back to CLI if cache unavailable
- **No breaking changes**: Both repos maintain compatibility with previous versions
