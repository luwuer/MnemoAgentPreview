import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { MnemoConfigSchema, type MnemoConfig } from './schema.js';

/**
 * 环境变量插值
 * 将配置值中的 ${ENV_VAR} 替换为对应环境变量
 */
function interpolateEnv(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (_, name) => {
      return process.env[name.trim()] ?? '';
    });
  }
  if (Array.isArray(value)) {
    return value.map(interpolateEnv);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = interpolateEnv(v);
    }
    return result;
  }
  return value;
}

/**
 * 加载 YAML 配置文件并校验
 * @param configPath 配置文件路径
 * @returns 校验后的 MnemoConfig
 */
export function loadConfig(configPath: string): MnemoConfig {
  const absPath = resolve(configPath);
  if (!existsSync(absPath)) {
    console.error(`[mnemo] 配置文件不存在: ${absPath}，使用默认配置`);
    return MnemoConfigSchema.parse({});
  }

  const raw = readFileSync(absPath, 'utf-8');
  const parsed = yaml.load(raw) as Record<string, unknown>;
  const interpolated = interpolateEnv(parsed) as Record<string, unknown>;
  return MnemoConfigSchema.parse(interpolated);
}

/** 获取默认配置 */
export function getDefaultConfig(): MnemoConfig {
  return MnemoConfigSchema.parse({});
}
