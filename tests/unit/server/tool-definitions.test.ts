/**
 * Tool definition contract tests.
 *
 * Asserts that advertised JSON Schemas in toolDefinitions match what the
 * underlying memoryjs Zod validators actually accept. A mismatch is a
 * contract lie — clients see an advertised field, pass it, then get
 * validation rejection.
 */

import { describe, it, expect } from 'vitest';
import { toolDefinitions } from '../../../src/server/toolDefinitions.js';

describe('toolDefinitions contract', () => {
  describe('save_search', () => {
    const def = toolDefinitions.find(t => t.name === 'save_search');

    it('exists', () => {
      expect(def).toBeDefined();
    });

    it('does NOT advertise `searchType` — Zod SavedSearchInputSchema is .strict() and rejects it', () => {
      // Smoke-test 2026-04-25 finding: tool def advertised `searchType`
      // but the underlying Zod schema in memoryjs rejected the call with
      // "Invalid saved search data". Removing the field makes the
      // contract honest.
      const props = def?.inputSchema?.properties as Record<string, unknown> | undefined;
      expect(props).toBeDefined();
      expect(props && 'searchType' in props).toBe(false);
    });

    it('preserves required = [name, query]', () => {
      expect(def?.inputSchema?.required).toEqual(['name', 'query']);
    });

    it('preserves additionalProperties: false', () => {
      expect(def?.inputSchema?.additionalProperties).toBe(false);
    });
  });

  describe('text that a client reads in tools/list', () => {
    // A tag such as a release version (v2.1.0), a memoryjs phase id (eta.4.4 written with the
    // Greek letter, 3B.4) or a release note in a description tells the client nothing about
    // the tool. It also goes stale. The "Phase 1:" to "Phase 8:" labels of the dream tools
    // are not tags: they name the stages of the pipeline.
    const RELEASE_TAG = /(?<![A-Za-z0-9_])(?:v\d+(?:\.\d+)*|η\.\d+(?:\.\d+)*(?:\.[a-z])?|3B\.\d+)(?![A-Za-z0-9_])/;

    const collect = (value: unknown, path: string, out: string[]): void => {
      if (typeof value === 'string') {
        if (RELEASE_TAG.test(value)) out.push(`${path}: ${value}`);
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => collect(item, `${path}[${i}]`, out));
      } else if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) collect(item, `${path}.${key}`, out);
      }
    };

    it('has no version or phase tag in any string of any tool definition', () => {
      const offenders: string[] = [];
      for (const def of toolDefinitions) collect(def, def.name, offenders);
      expect(toolDefinitions.length).toBeGreaterThan(0);
      expect(offenders).toEqual([]);
    });

    it('does not flag the dream pipeline stages, which are not tags', () => {
      const dream = toolDefinitions.find(t => t.name === 'dream_start');
      const stages = JSON.stringify(dream?.inputSchema);
      expect(stages).toContain('Phase 1:');
      expect(RELEASE_TAG.test(stages)).toBe(false);
    });
  });
});
