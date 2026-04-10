import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildVercelEnvironmentPayloads,
  buildVercelDeployArgs,
  buildVercelEnvironmentUrl,
  loadCloudDeployEnvironment,
  readCloudDeployConfig,
  resolveDeployEnvironmentPath,
  shouldUpsertVercelEnvironmentVariables,
} from './deployCloud'

describe('readCloudDeployConfig', () => {
  it('throws with every missing deployment variable', () => {
    expect(() => readCloudDeployConfig({})).toThrowError(
      'Missing deployment environment variables: SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, SUPABASE_PROJECT_ID, VERCEL_TOKEN, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_URL',
    )
  })

  it('returns a normalized config when every variable is present', () => {
    const config = readCloudDeployConfig({
      SUPABASE_ACCESS_TOKEN: 'supabase-token',
      SUPABASE_DB_PASSWORD: 'db-password',
      SUPABASE_PROJECT_ID: 'project-ref',
      VERCEL_TOKEN: 'vercel-token',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      VITE_SUPABASE_URL: 'https://mentii.supabase.co',
    })

    expect(config).toEqual({
      supabaseAccessToken: 'supabase-token',
      supabaseDbPassword: 'db-password',
      supabaseProjectId: 'project-ref',
      vercelOrgId: null,
      vercelProjectId: null,
      vercelScope: null,
      vercelToken: 'vercel-token',
      vercelPublicEnv: {
        VITE_SUPABASE_ANON_KEY: 'anon-key',
        VITE_SUPABASE_URL: 'https://mentii.supabase.co',
      },
    })
  })
})

describe('buildVercelEnvironmentUrl', () => {
  it('creates an upsert endpoint scoped to the Vercel team', () => {
    expect(
      buildVercelEnvironmentUrl({
        vercelOrgId: 'team_123',
        vercelProjectId: 'prj_123',
      }),
    ).toBe('https://api.vercel.com/v10/projects/prj_123/env?teamId=team_123&upsert=true')
  })
})

describe('resolveDeployEnvironmentPath', () => {
  it('defaults to the home deploy env file', () => {
    expect(resolveDeployEnvironmentPath({ HOME: '/Users/tester' })).toBe('/Users/tester/.mentii-deploy.env')
  })

  it('prefers DEPLOY_ENV_FILE when provided', () => {
    expect(
      resolveDeployEnvironmentPath({
        DEPLOY_ENV_FILE: '/tmp/custom.env',
        HOME: '/Users/tester',
      }),
    ).toBe('/tmp/custom.env')
  })
})

describe('loadCloudDeployEnvironment', () => {
  it('loads values from the deploy env file without overriding explicit env vars', () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), 'mentii-deploy-env-'))
    const envFilePath = join(tempDirectory, 'deploy.env')

    writeFileSync(
      envFilePath,
      "VERCEL_TOKEN='file-token'\nVITE_SUPABASE_URL='https://from-file.supabase.co'\n",
      'utf8',
    )

    try {
      const loadedEnv = loadCloudDeployEnvironment(
        {
          VERCEL_TOKEN: 'explicit-token',
        },
        envFilePath,
      )

      expect(loadedEnv.VERCEL_TOKEN).toBe('explicit-token')
      expect(loadedEnv.VITE_SUPABASE_URL).toBe('https://from-file.supabase.co')
    } finally {
      rmSync(tempDirectory, { force: true, recursive: true })
    }
  })
})

describe('buildVercelEnvironmentPayloads', () => {
  it('creates production-scoped payloads for the public Supabase values', () => {
    expect(
      buildVercelEnvironmentPayloads({
        VITE_SUPABASE_ANON_KEY: 'anon-key',
        VITE_SUPABASE_URL: 'https://mentii.supabase.co',
      }),
    ).toEqual([
      {
        comment: 'Managed by scripts/deployCloud.ts',
        key: 'VITE_SUPABASE_ANON_KEY',
        target: ['production'],
        type: 'plain',
        value: 'anon-key',
      },
      {
        comment: 'Managed by scripts/deployCloud.ts',
        key: 'VITE_SUPABASE_URL',
        target: ['production'],
        type: 'plain',
        value: 'https://mentii.supabase.co',
      },
    ])
  })
})

describe('shouldUpsertVercelEnvironmentVariables', () => {
  it('requires both the org id and the project id', () => {
    expect(
      shouldUpsertVercelEnvironmentVariables({
        vercelOrgId: 'team_123',
        vercelProjectId: 'prj_123',
      }),
    ).toBe(true)

    expect(
      shouldUpsertVercelEnvironmentVariables({
        vercelOrgId: 'team_123',
        vercelProjectId: null,
      }),
    ).toBe(false)
  })
})

describe('buildVercelDeployArgs', () => {
  it('passes the public Supabase values as build and runtime env vars', () => {
    expect(
      buildVercelDeployArgs({
        vercelOrgId: null,
        vercelProjectId: null,
        vercelPublicEnv: {
          VITE_SUPABASE_ANON_KEY: 'anon-key',
          VITE_SUPABASE_URL: 'https://mentii.supabase.co',
        },
        vercelScope: null,
        vercelToken: 'vercel-token',
      }),
    ).toEqual([
      'vercel',
      'deploy',
      '--prod',
      '--yes',
      '--token',
      'vercel-token',
      '-b',
      'VITE_SUPABASE_URL=https://mentii.supabase.co',
      '-e',
      'VITE_SUPABASE_URL=https://mentii.supabase.co',
      '-b',
      'VITE_SUPABASE_ANON_KEY=anon-key',
      '-e',
      'VITE_SUPABASE_ANON_KEY=anon-key',
    ])
  })

  it('adds a scope override when one is provided', () => {
    expect(
      buildVercelDeployArgs({
        vercelOrgId: null,
        vercelProjectId: null,
        vercelPublicEnv: {
          VITE_SUPABASE_ANON_KEY: 'anon-key',
          VITE_SUPABASE_URL: 'https://mentii.supabase.co',
        },
        vercelScope: 'my-team',
        vercelToken: 'vercel-token',
      }),
    ).toContain('--scope')
  })
})
