import fs from 'node:fs'
import path from 'node:path'

export interface PatchPolicyResult {
  ok: boolean
  expectedPatch: string
  found: boolean
  packageName: string
  packageVersion: string
  message?: string
}

export interface PatchPolicyOptions {
  packageJsonPath?: string
  patchDir?: string
  packageName?: string
  versionOverride?: string
  strict?: boolean
}

/**
 * Validate that our required patch matches the installed dependency version.
 * Default target: @ai-sdk-tools/agents with patch file in patches/@ai-sdk-tools+agents+<version>.patch
 */
export function checkPatchPolicy(opts: PatchPolicyOptions = {}): PatchPolicyResult {
  const packageJsonPath = opts.packageJsonPath || path.resolve(process.cwd(), 'package.json')
  const patchDir = opts.patchDir || path.resolve(process.cwd(), 'patches')
  const packageName = opts.packageName || '@ai-sdk-tools/agents'

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const rawVersion: string = (pkg.dependencies?.[packageName] || pkg.devDependencies?.[packageName] || '').trim()
  const cleanedVersion = (opts.versionOverride || rawVersion).replace(/^[~^]/, '')

  const expectedPatch = `${packageName.replaceAll('/', '+')}+${cleanedVersion}.patch`
  const patchPath = path.join(patchDir, expectedPatch)
  const found = fs.existsSync(patchPath)

  const ok = Boolean(cleanedVersion) && found
  const message = ok
    ? `Patch OK for ${packageName}@${cleanedVersion}`
    : `Missing/mismatch patch. Expected ${expectedPatch} in ${patchDir}`

  return {
    ok,
    expectedPatch,
    found,
    packageName,
    packageVersion: cleanedVersion,
    message,
  }
}

/**
 * Throw or warn when patch policy is not satisfied.
 * Use in build/start hooks to avoid silent regressions.
 */
export function assertPatchPolicy(opts: PatchPolicyOptions = {}) {
  const { strict = false } = opts
  const result = checkPatchPolicy(opts)
  if (!result.ok) {
    const text = `Upgrade Guard: ${result.message}`
    if (strict) {
      throw new Error(text)
    } else {
      // eslint-disable-next-line no-console
      console.warn(text)
    }
  }
  return result
}

