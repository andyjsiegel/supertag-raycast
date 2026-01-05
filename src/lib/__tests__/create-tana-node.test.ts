/**
 * Tests for Create Tana Node field options loading
 *
 * Covers:
 * - Field options loading for "options" type fields
 * - Field options loading for "reference" type fields
 * - Proper handling of targetSupertag for inherited fields
 * - Deduplication of field values
 */

import { describe, it, expect } from "bun:test";

// Mock types matching the actual CLI response formats
interface FieldValueResponse {
  tupleId: string;
  parentId: string;
  fieldDefId: string;
  fieldName: string;
  valueNodeId: string;
  valueText: string;
  valueOrder: number;
  created: number;
}

interface SearchNodeResponse {
  id: string;
  name: string;
}

interface FieldOption {
  id: string;
  text: string;
}

/**
 * Parse field values response (from `supertag fields values`)
 * This is the actual logic from cli.ts that needs to be correct
 */
function parseFieldValues(values: FieldValueResponse[]): FieldOption[] {
  const seen = new Set<string>();
  const unique: FieldOption[] = [];
  for (const v of values) {
    if (v.valueNodeId && v.valueText && !seen.has(v.valueNodeId)) {
      seen.add(v.valueNodeId);
      unique.push({ id: v.valueNodeId, text: v.valueText });
    }
  }
  return unique;
}

/**
 * Parse search nodes response (from `supertag search --tag`)
 */
function parseSearchNodes(nodes: SearchNodeResponse[]): FieldOption[] {
  return nodes.map((n) => ({ id: n.id, text: n.name }));
}

describe("Field Options Parsing", () => {
  describe("parseFieldValues", () => {
    it("should extract unique options by valueNodeId", () => {
      const values: FieldValueResponse[] = [
        {
          tupleId: "t1",
          parentId: "p1",
          fieldDefId: "f1",
          fieldName: "⚙️ Status",
          valueNodeId: "Pg_ubWBIaT14",
          valueText: "Active",
          valueOrder: 0,
          created: 1767509161426,
        },
        {
          tupleId: "t2",
          parentId: "p2",
          fieldDefId: "f1",
          fieldName: "⚙️ Status",
          valueNodeId: "Pg_ubWBIaT14", // Duplicate ID
          valueText: "Active",
          valueOrder: 0,
          created: 1767509101599,
        },
        {
          tupleId: "t3",
          parentId: "p3",
          fieldDefId: "f1",
          fieldName: "⚙️ Status",
          valueNodeId: "_-_ybc29Fvrr",
          valueText: "Later",
          valueOrder: 0,
          created: 1767518014782,
        },
      ];

      const result = parseFieldValues(values);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "Pg_ubWBIaT14", text: "Active" });
      expect(result[1]).toEqual({ id: "_-_ybc29Fvrr", text: "Later" });
    });

    it("should skip entries with missing valueNodeId", () => {
      const values: FieldValueResponse[] = [
        {
          tupleId: "t1",
          parentId: "p1",
          fieldDefId: "f1",
          fieldName: "Status",
          valueNodeId: "", // Empty ID
          valueText: "Active",
          valueOrder: 0,
          created: 1,
        },
        {
          tupleId: "t2",
          parentId: "p2",
          fieldDefId: "f1",
          fieldName: "Status",
          valueNodeId: "valid-id",
          valueText: "Later",
          valueOrder: 0,
          created: 2,
        },
      ];

      const result = parseFieldValues(values);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Later");
    });

    it("should skip entries with missing valueText", () => {
      const values: FieldValueResponse[] = [
        {
          tupleId: "t1",
          parentId: "p1",
          fieldDefId: "f1",
          fieldName: "Status",
          valueNodeId: "id1",
          valueText: "", // Empty text
          valueOrder: 0,
          created: 1,
        },
        {
          tupleId: "t2",
          parentId: "p2",
          fieldDefId: "f1",
          fieldName: "Status",
          valueNodeId: "id2",
          valueText: "Valid",
          valueOrder: 0,
          created: 2,
        },
      ];

      const result = parseFieldValues(values);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Valid");
    });

    it("should handle corrupted data with node IDs as text", () => {
      // This is actual corrupted data from the user's workspace
      const values: FieldValueResponse[] = [
        {
          tupleId: "t1",
          parentId: "p1",
          fieldDefId: "",
          fieldName: "⚙️ Status",
          valueNodeId: "oa3HwuVmZ94w",
          valueText: "Pg_ubWBIaT14", // This is a node ID, not text!
          valueOrder: 0,
          created: 1,
        },
        {
          tupleId: "t2",
          parentId: "p2",
          fieldDefId: "",
          fieldName: "⚙️ Status",
          valueNodeId: "Jh4UnE7_MwF8",
          valueText: "[object Object]", // Corrupted serialization
          valueOrder: 0,
          created: 2,
        },
        {
          tupleId: "t3",
          parentId: "p3",
          fieldDefId: "",
          fieldName: "⚙️ Status",
          valueNodeId: "Pg_ubWBIaT14",
          valueText: "Active", // Valid
          valueOrder: 0,
          created: 3,
        },
      ];

      const result = parseFieldValues(values);

      // Currently this passes through corrupted data - documenting current behavior
      // A future improvement could filter these out
      expect(result).toHaveLength(3);
      expect(result.find((r) => r.text === "Active")).toBeDefined();
    });
  });

  describe("parseSearchNodes", () => {
    it("should convert search results to field options", () => {
      const nodes: SearchNodeResponse[] = [
        { id: "KXSuY3luJ4zr", name: "Demo Project" },
        { id: "ABC123", name: "Another Project" },
      ];

      const result = parseSearchNodes(nodes);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "KXSuY3luJ4zr", text: "Demo Project" });
      expect(result[1]).toEqual({ id: "ABC123", text: "Another Project" });
    });

    it("should handle empty results", () => {
      const nodes: SearchNodeResponse[] = [];

      const result = parseSearchNodes(nodes);

      expect(result).toHaveLength(0);
    });
  });
});

describe("Schema Cache Field Inheritance", () => {
  // Mock CachedSupertag and CachedField types
  interface CachedField {
    attributeId: string;
    name: string;
    normalizedName: string;
    dataType?: string;
    targetSupertag?: {
      id: string;
      name: string;
    };
    originTagName?: string;
    depth?: number;
  }

  interface CachedSupertag {
    id: string;
    name: string;
    normalizedName: string;
    fields: CachedField[];
    extends?: string[];
  }

  /**
   * Collect inherited fields - mirrors SchemaCache.collectInheritedFields
   */
  function collectInheritedFields(
    supertag: CachedSupertag,
    allSupertags: Map<string, CachedSupertag>,
    visited: Set<string> = new Set(),
    depth: number = 0,
  ): CachedField[] {
    if (visited.has(supertag.id)) return [];
    visited.add(supertag.id);

    const allFields: CachedField[] = [];
    const seenFieldNames = new Set<string>();

    // Add own fields first
    for (const field of supertag.fields) {
      if (!seenFieldNames.has(field.name)) {
        seenFieldNames.add(field.name);
        allFields.push({
          ...field,
          originTagName: supertag.name,
          depth: depth,
        });
      }
    }

    // Add inherited fields from parents
    if (supertag.extends) {
      for (const parentId of supertag.extends) {
        const parent = Array.from(allSupertags.values()).find(
          (s) => s.id === parentId,
        );
        if (parent) {
          const parentFields = collectInheritedFields(
            parent,
            allSupertags,
            visited,
            depth + 1,
          );
          for (const field of parentFields) {
            if (!seenFieldNames.has(field.name)) {
              seenFieldNames.add(field.name);
              allFields.push(field);
            }
          }
        }
      }
    }

    return allFields;
  }

  it("should preserve targetSupertag for own fields", () => {
    const todo: CachedSupertag = {
      id: "todo-id",
      name: "todo",
      normalizedName: "todo",
      fields: [
        {
          attributeId: "attr1",
          name: "Parent",
          normalizedName: "parent",
          dataType: "reference",
          targetSupertag: {
            id: "project-id",
            name: "project",
          },
        },
      ],
    };

    const allSupertags = new Map([["todo", todo]]);
    const fields = collectInheritedFields(todo, allSupertags);

    expect(fields).toHaveLength(1);
    expect(fields[0].targetSupertag).toBeDefined();
    expect(fields[0].targetSupertag?.name).toBe("project");
  });

  it("should preserve targetSupertag for inherited fields", () => {
    const taskBase: CachedSupertag = {
      id: "task-base-id",
      name: "task-base",
      normalizedName: "taskbase",
      fields: [
        {
          attributeId: "topic-attr",
          name: "Topic",
          normalizedName: "topic",
          dataType: "reference",
          targetSupertag: {
            id: "topic-tag-id",
            name: "topic",
          },
        },
      ],
    };

    const todo: CachedSupertag = {
      id: "todo-id",
      name: "todo",
      normalizedName: "todo",
      fields: [],
      extends: ["task-base-id"],
    };

    const allSupertags = new Map([
      ["task-base", taskBase],
      ["todo", todo],
    ]);

    const fields = collectInheritedFields(todo, allSupertags);

    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("Topic");
    expect(fields[0].targetSupertag).toBeDefined();
    expect(fields[0].targetSupertag?.name).toBe("topic");
    expect(fields[0].originTagName).toBe("task-base");
    expect(fields[0].depth).toBe(1);
  });

  it("should preserve targetSupertag for options type fields", () => {
    const functionStatus: CachedSupertag = {
      id: "func-status-id",
      name: "Function | Status (Pro)",
      normalizedName: "functionstatuspro",
      fields: [
        {
          attributeId: "status-attr",
          name: "⚙️ Status",
          normalizedName: "status",
          dataType: "options",
          // Note: Some options fields may have targetSupertag for "options from supertag"
          targetSupertag: {
            id: "status-tag-id",
            name: "Status",
          },
        },
      ],
    };

    const streamActions: CachedSupertag = {
      id: "stream-actions-id",
      name: "Stream | Actions",
      normalizedName: "streamactions",
      fields: [],
      extends: ["func-status-id"],
    };

    const todo: CachedSupertag = {
      id: "todo-id",
      name: "todo",
      normalizedName: "todo",
      fields: [],
      extends: ["stream-actions-id"],
    };

    const allSupertags = new Map([
      ["Function | Status (Pro)", functionStatus],
      ["Stream | Actions", streamActions],
      ["todo", todo],
    ]);

    const fields = collectInheritedFields(todo, allSupertags);

    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("⚙️ Status");
    expect(fields[0].dataType).toBe("options");
    expect(fields[0].targetSupertag?.name).toBe("Status");
  });

  it("should handle deep inheritance chains", () => {
    const grandparent: CachedSupertag = {
      id: "gp-id",
      name: "grandparent",
      normalizedName: "grandparent",
      fields: [
        {
          attributeId: "vault-attr",
          name: "⚙️ Vault",
          normalizedName: "vault",
          dataType: "reference",
          targetSupertag: { id: "vault-id", name: "Vault" },
        },
      ],
    };

    const parent: CachedSupertag = {
      id: "p-id",
      name: "parent",
      normalizedName: "parent",
      fields: [
        {
          attributeId: "focus-attr",
          name: "⚙️ Focus",
          normalizedName: "focus",
          dataType: "options",
          targetSupertag: { id: "focus-id", name: "Type | Focus" },
        },
      ],
      extends: ["gp-id"],
    };

    const child: CachedSupertag = {
      id: "c-id",
      name: "child",
      normalizedName: "child",
      fields: [
        {
          attributeId: "status-attr",
          name: "⚙️ Status",
          normalizedName: "status",
          dataType: "options",
        },
      ],
      extends: ["p-id"],
    };

    const allSupertags = new Map([
      ["grandparent", grandparent],
      ["parent", parent],
      ["child", child],
    ]);

    const fields = collectInheritedFields(child, allSupertags);

    expect(fields).toHaveLength(3);

    const statusField = fields.find((f) => f.name === "⚙️ Status");
    expect(statusField?.depth).toBe(0);
    expect(statusField?.targetSupertag).toBeUndefined();

    const focusField = fields.find((f) => f.name === "⚙️ Focus");
    expect(focusField?.depth).toBe(1);
    expect(focusField?.targetSupertag?.name).toBe("Type | Focus");

    const vaultField = fields.find((f) => f.name === "⚙️ Vault");
    expect(vaultField?.depth).toBe(2);
    expect(vaultField?.targetSupertag?.name).toBe("Vault");
  });
});

describe("Field Options Loading Logic", () => {
  interface SupertagField {
    fieldName: string;
    fieldLabelId: string;
    inferredDataType: string;
    targetSupertagId?: string;
    targetSupertagName?: string;
    originTagName: string;
    depth: number;
  }

  /**
   * Determine which fetch method to use for a field
   * This tests the logic from create-tana-node.tsx preloadSchema
   *
   * Key insight: "options" fields ALWAYS use getFieldOptions (historical values)
   * because that's how Tana stores the selected values, even for "options from supertag".
   * Only "reference" fields use getNodesBySupertag.
   */
  function getFieldFetchMethod(
    field: SupertagField,
  ): "supertag" | "fieldValues" | "none" {
    // Options fields ALWAYS use historical field values
    // (targetSupertag is just metadata about valid values, not the source)
    if (field.inferredDataType === "options") {
      return "fieldValues";
    }
    // Reference fields with targetSupertag fetch from that supertag
    if (field.inferredDataType === "reference" && field.targetSupertagName) {
      return "supertag";
    }
    // Reference fields without targetSupertag have no options
    return "none";
  }

  it("should use supertag fetch for reference fields with targetSupertag", () => {
    const field: SupertagField = {
      fieldName: "Parent",
      fieldLabelId: "attr1",
      inferredDataType: "reference",
      targetSupertagId: "project-id",
      targetSupertagName: "project",
      originTagName: "todo",
      depth: 0,
    };

    expect(getFieldFetchMethod(field)).toBe("supertag");
  });

  it("should use fieldValues fetch for options fields WITH targetSupertag", () => {
    // This is the key test - options fields use fieldValues even with targetSupertag
    const field: SupertagField = {
      fieldName: "⚙️ Focus",
      fieldLabelId: "attr2",
      inferredDataType: "options",
      targetSupertagId: "focus-id",
      targetSupertagName: "Type | Focus",
      originTagName: "todo",
      depth: 0,
    };

    // Should use fieldValues, NOT supertag!
    expect(getFieldFetchMethod(field)).toBe("fieldValues");
  });

  it("should use fieldValues fetch for options fields without targetSupertag", () => {
    const field: SupertagField = {
      fieldName: "⚙️ Status",
      fieldLabelId: "attr3",
      inferredDataType: "options",
      // No targetSupertag - uses historical field values
      originTagName: "Function | Status (Pro)",
      depth: 2,
    };

    expect(getFieldFetchMethod(field)).toBe("fieldValues");
  });

  it("should return none for reference fields without targetSupertag", () => {
    const field: SupertagField = {
      fieldName: "Related",
      fieldLabelId: "attr4",
      inferredDataType: "reference",
      // No targetSupertag - cannot determine what to fetch
      originTagName: "task",
      depth: 0,
    };

    expect(getFieldFetchMethod(field)).toBe("none");
  });

  it("should use supertag fetch for Topic (reference with targetSupertag)", () => {
    const field: SupertagField = {
      fieldName: "Topic",
      fieldLabelId: "topic-attr",
      inferredDataType: "reference",
      targetSupertagId: "topic-tag-id",
      targetSupertagName: "topic",
      originTagName: "task-base",
      depth: 1,
    };

    expect(getFieldFetchMethod(field)).toBe("supertag");
  });
});
