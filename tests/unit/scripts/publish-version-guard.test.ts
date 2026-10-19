import { describe, expect, it } from 'vitest';
import { assertTagMatchesPackageVersion, versionFromTag } from '../../../scripts/publish-version-guard.mjs';

// scripts/publish-version-guard.mjs stops a publish when the pushed tag names another version than package.json.
describe('versionFromTag', () => {
  it('reads the version from a short tag and from a full ref', () => {
    expect(versionFromTag('v12.9.1')).toBe('12.9.1');
    expect(versionFromTag('refs/tags/v12.9.1')).toBe('12.9.1');
  });

  it('returns null for a ref that is not a v* tag', () => {
    expect(versionFromTag('main')).toBeNull();
    expect(versionFromTag('refs/heads/main')).toBeNull();
    expect(versionFromTag('v')).toBeNull();
    expect(versionFromTag('')).toBeNull();
  });
});

describe('assertTagMatchesPackageVersion', () => {
  it('accepts a tag that names the package version', () => {
    expect(assertTagMatchesPackageVersion('v12.9.1', '12.9.1').ok).toBe(true);
  });

  it('refuses the tag of the previous release', () => {
    const result = assertTagMatchesPackageVersion('v12.9.0', '12.9.1');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('12.9.0');
    expect(result.message).toContain('12.9.1');
  });

  it('refuses a branch name', () => {
    expect(assertTagMatchesPackageVersion('main', '12.9.1').ok).toBe(false);
  });
});
