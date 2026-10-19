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

  // Nothing between a client and a handler validates arguments against the inputSchema, so the
  // text of tools/list is the whole contract for a client. A parameter that a handler accepts and
  // ignores must say so in plain words, and a key that a handler stores must be declared.
  describe('parameters that a handler accepts', () => {
    type Schema = Record<string, unknown> & { properties?: Record<string, Record<string, unknown>> };

    const tool = (name: string) => {
      const def = toolDefinitions.find(t => t.name === name);
      expect(def, `tool ${name} exists`).toBeDefined();
      return def as { description: string; inputSchema: Schema };
    };
    const props = (name: string) => tool(name).inputSchema.properties ?? {};
    const text = (value: unknown) => String(value ?? '');

    describe('adaptive_retrieve', () => {
      const IGNORED = ['budgetTokens', 'maxRounds', 'minCoverage', 'resultsPerRound'];

      it('keeps all four parameters in the schema', () => {
        for (const key of IGNORED) expect(Object.keys(props('adaptive_retrieve')), key).toContain(key);
      });

      it.each(IGNORED)('says in plain words that %s is accepted and ignored', key => {
        expect(text(props('adaptive_retrieve')[key].description)).toMatch(/^Accepted and ignored/);
      });

      it.each(IGNORED)('declares no default for %s', key => {
        expect(props('adaptive_retrieve')[key]).not.toHaveProperty('default');
      });

      it('names the four parameters as ignored in the tool description', () => {
        const description = tool('adaptive_retrieve').description;
        for (const key of IGNORED) expect(description, key).toContain(key);
        expect(description).toMatch(/accepted and ignored/);
      });

      it('does not describe a budget check that the handler does not make', () => {
        expect(JSON.stringify(tool('adaptive_retrieve'))).not.toMatch(/rejects retrieval/);
      });
    });

    it('session_start says that metadata is accepted and ignored', () => {
      expect(text(props('session_start').metadata.description)).toMatch(/^Accepted and ignored/);
      expect(tool('session_start').description).toMatch(/metadata/);
    });

    it('add_procedure says that the stored procedure reports its id as its name', () => {
      expect(text(props('add_procedure').name.description)).toMatch(/^Accepted/);
      expect(text(props('add_procedure').name.description)).toMatch(/id as its name/);
    });

    describe('saved searches', () => {
      // The handlers also accept `entityType` and store it, but a saved search does not apply it
      // when it runs. It stays out of both declarations (see declared-parameters.test.ts), so a
      // client has no reason to rely on it.
      it('update_saved_search declares the five keys that a running search applies', () => {
        const updates = props('update_saved_search').updates as Schema;
        expect(Object.keys(updates.properties ?? {}).sort()).toEqual(['description', 'maxImportance', 'minImportance', 'query', 'tags']);
      });
    });

    describe('relations', () => {
      const items = (name: string) => props(name).relations.items as Schema & { required?: string[] };

      it('create_relations declares weight, confidence and metadata', () => {
        const item = items('create_relations');
        expect(Object.keys(item.properties ?? {}).sort()).toEqual(['confidence', 'from', 'metadata', 'relationType', 'to', 'weight']);
        for (const key of ['weight', 'confidence']) {
          expect(item.properties?.[key], key).toMatchObject({ type: 'number', minimum: 0, maximum: 1 });
        }
        expect(item.properties?.metadata.type).toBe('object');
        expect(item.required).toEqual(['from', 'to', 'relationType']);
      });

      it('delete_relations declares only the three keys that the storage layer matches on', () => {
        const item = items('delete_relations');
        expect(Object.keys(item.properties ?? {}).sort()).toEqual(['from', 'relationType', 'to']);
        expect(item.required).toEqual(['from', 'to', 'relationType']);
      });
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
