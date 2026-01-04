/**
 * Supertag options for Tana capture
 */
export const SUPERTAGS = ["todo", "note", "idea"] as const;
export type Supertag = (typeof SUPERTAGS)[number];
