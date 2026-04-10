import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import dotenv from 'dotenv'

const REQUIRED_DEPLOY_ENV_NAMES = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_PROJECT_ID',
  'VERCEL_TOKEN',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_URL',
] as const

type RequiredDeployEnvName = (typeof REQUIRED_DEPLOY_ENV_NAMES)[number]

type CloudDeployConfig = {
  supabaseAccessToken: string
  supabaseDbPassword: string
  supabaseProjectId: string
  vercelOrgId: string | null
  vercelProjectId: string | null
  vercelScope: string | null
  vercelToken: string
  vercelPublicEnv: {
    VITE_SUPABASE_ANON_KEY: string
    VITE_SUPABASE_URL: string
  }
}

type VercelEnvironmentPayload = {
  comment: string
  key: 'VITE_SUPABASE_ANON_KEY' | 'VITE_SUPABASE_URL'
  target: ['production']
  type: 'plain'
  value: string
}

function getRequiredValue(env: NodeJS.ProcessEnv, name: RequiredDeployEnvName) {
  return env[name]?.trim() ?? ''
}

function getOptionalValue(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name]?.trim()
  return value ? value : null
}

export function resolveDeployEnvironmentPath(env: NodeJS.ProcessEnv) {
  const explicitPath = env.DEPLOY_ENV_FILE?.trim()

  if (explicitPath) {
    return explicitPath
  }

  const homeDirectory = env.HOME?.trim()

  return homeDirectory ? join(homeDirectory, '.mentii-deploy.env') : '.mentii-deploy.env'
}

export function loadCloudDeployEnvironment(env: NodeJS.ProcessEnv, filePath = resolveDeployEnvironmentPath(env)) {
  if (!existsSync(filePath)) {
    return { ...env }
  }

  const parsedFile = dotenv.parse(readFileSync(filePath, 'utf8'))

  return {
    ...parsedFile,
    ...env,
  }
}

export function readCloudDeployConfig(env: NodeJS.ProcessEnv): CloudDeployConfig {
  const missingNames = REQUIRED_DEPLOY_ENV_NAMES.filter((name) => !getRequiredValue(env, name))

  if (missingNames.length > 0) {
    throw new Error(`Missing deployment environment variables: ${missingNames.join(', ')}`)
  }

  return {
    supabaseAccessToken: getRequiredValue(env, 'SUPABASE_ACCESS_TOKEN'),
    supabaseDbPassword: getRequiredValue(env, 'SUPABASE_DB_PASSWORD'),
    supabaseProjectId: getRequiredValue(env, 'SUPABASE_PROJECT_ID'),
    vercelOrgId: getOptionalValue(env, 'VERCEL_ORG_ID'),
    vercelProjectId: getOptionalValue(env, 'VERCEL_PROJECT_ID'),
    vercelScope: getOptionalValue(env, 'VERCEL_SCOPE'),
    vercelPublicEnv: {
      VITE_SUPABASE_ANON_KEY: getRequiredValue(env, 'VITE_SUPABASE_ANON_KEY'),
      VITE_SUPABASE_URL: getRequiredValue(env, 'VITE_SUPABASE_URL'),
    },
    vercelToken: getRequiredValue(env, 'VERCEL_TOKEN'),
  }
}

export function buildVercelEnvironmentUrl(config: Pick<CloudDeployConfig, 'vercelOrgId' | 'vercelProjectId'>) {
  if (!config.vercelOrgId || !config.vercelProjectId) {
    throw new Error('Vercel org and project ids are required to upsert project environment variables.')
  }

  const query = new URLSearchParams({
    teamId: config.vercelOrgId,
    upsert: 'true',
  })

  return `https://api.vercel.com/v10/projects/${encodeURIComponent(config.vercelProjectId)}/env?${query.toString()}`
}

export function buildVercelEnvironmentPayloads(
  publicEnv: CloudDeployConfig['vercelPublicEnv'],
): VercelEnvironmentPayload[] {
  return [
    {
      comment: 'Managed by scripts/deployCloud.ts',
      key: 'VITE_SUPABASE_ANON_KEY',
      target: ['production'],
      type: 'plain',
      value: publicEnv.VITE_SUPABASE_ANON_KEY,
    },
    {
      comment: 'Managed by scripts/deployCloud.ts',
      key: 'VITE_SUPABASE_URL',
      target: ['production'],
      type: 'plain',
      value: publicEnv.VITE_SUPABASE_URL,
    },
  ]
}

export function shouldUpsertVercelEnvironmentVariables(
  config: Pick<CloudDeployConfig, 'vercelOrgId' | 'vercelProjectId'>,
) {
  return Boolean(config.vercelOrgId && config.vercelProjectId)
}

export function buildVercelDeployArgs(
  config: Pick<CloudDeployConfig, 'vercelPublicEnv' | 'vercelScope' | 'vercelToken'>,
) {
  const args = ['vercel', 'deploy', '--prod', '--yes', '--token', config.vercelToken]

  if (config.vercelScope) {
    args.push('--scope', config.vercelScope)
  }

  args.push('-b', `VITE_SUPABASE_URL=${config.vercelPublicEnv.VITE_SUPABASE_URL}`)
  args.push('-e', `VITE_SUPABASE_URL=${config.vercelPublicEnv.VITE_SUPABASE_URL}`)
  args.push('-b', `VITE_SUPABASE_ANON_KEY=${config.vercelPublicEnv.VITE_SUPABASE_ANON_KEY}`)
  args.push('-e', `VITE_SUPABASE_ANON_KEY=${config.vercelPublicEnv.VITE_SUPABASE_ANON_KEY}`)

  return args
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    env,
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status ?? 'unknown'}`)
  }
}

async function upsertVercelEnvironmentVariables(config: CloudDeployConfig) {
  if (!shouldUpsertVercelEnvironmentVariables(config)) {
    return
  }

  const url = buildVercelEnvironmentUrl(config)

  for (const payload of buildVercelEnvironmentPayloads(config.vercelPublicEnv)) {
    const response = await fetch(url, {
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${config.vercelToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`Vercel env upsert failed for ${payload.key}: ${response.status} ${responseText}`)
    }

    const parsedResponse = responseText ? (JSON.parse(responseText) as { failed?: Array<{ error?: { message?: string } }> }) : {}

    if (parsedResponse.failed?.length) {
      const failedMessages = parsedResponse.failed
        .map((failure) => failure.error?.message)
        .filter((message): message is string => Boolean(message))

      throw new Error(
        `Vercel env upsert failed for ${payload.key}: ${failedMessages.join('; ') || 'Unknown error'}`,
      )
    }
  }
}

export async function deployCloud(env: NodeJS.ProcessEnv) {
  const deployEnvironment = loadCloudDeployEnvironment(env)
  const config = readCloudDeployConfig(deployEnvironment)
  const commandEnv = {
    ...deployEnvironment,
    SUPABASE_ACCESS_TOKEN: config.supabaseAccessToken,
    SUPABASE_DB_PASSWORD: config.supabaseDbPassword,
    SUPABASE_PROJECT_ID: config.supabaseProjectId,
  }

  if (config.vercelOrgId) {
    commandEnv.VERCEL_ORG_ID = config.vercelOrgId
  }

  if (config.vercelProjectId) {
    commandEnv.VERCEL_PROJECT_ID = config.vercelProjectId
  }

  runCommand('supabase', ['db', 'push', '--linked', '--password', config.supabaseDbPassword, '--yes'], commandEnv)
  await upsertVercelEnvironmentVariables(config)
  runCommand('npx', buildVercelDeployArgs(config), commandEnv)
}

async function main() {
  await deployCloud(process.env)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
