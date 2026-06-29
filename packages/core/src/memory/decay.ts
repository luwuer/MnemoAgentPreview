import type { MemoryStore } from './store.js';
import type { MemoryDecayConfig } from '../config/schema.js';

export const DEFAULT_DECAY_OPTIONS: Required<MemoryDecayConfig> = {
  lambda: 0.0001,
  decayThreshold: 0.2,
  baseDecay: 0.95,
};

/**
 * 计算衰减分数 — 艾宾浩斯遗忘曲线
 *
 * decayScore = baseDecay × e^(-λ × Δt)
 * - Δt: 距上次访问的毫秒数
 * - λ: 衰减常数（越小遗忘越慢）
 * - baseDecay: 基础衰减值
 */
export function computeDecayScore(
  lastAccessedAt: number,
  now: number,
  config: Required<MemoryDecayConfig>
): number {
  const deltaT = now - lastAccessedAt;
  return config.baseDecay * Math.exp(-config.lambda * deltaT);
}

/**
 * 强化记忆 — 召回访问时调用
 *
 * 更新访问时间 + 访问次数，并基于访问频次提升衰减基础值（抗遗忘）
 */
export async function reinforceMemory(
  store: MemoryStore,
  memoryId: string,
  config: Required<MemoryDecayConfig>
): Promise<void> {
  const node = await store.getMemory(memoryId);
  if (!node) return;
  const now = Date.now();
  // 访问频次越高，基础衰减值越高（越不容易遗忘）
  const reinforceBoost = Math.min(0.1 * node.accessCount, 0.3);
  const newDecayScore = Math.min(1, config.baseDecay + reinforceBoost);
  await store.updateMemory(memoryId, {
    lastAccessedAt: now,
    accessCount: node.accessCount + 1,
    decayScore: newDecayScore,
  });
}

/**
 * 批量衰减更新 + 降级 — 定期执行（如每小时）
 *
 * 遍历所有 active 记忆，重算衰减分数：
 * - 低于阈值 → 标记为 decayed（降权但不删除）
 * - 高于阈值 → 更新衰减分数
 *
 * @returns 被降级的记忆数量
 */
export async function applyDecay(
  store: MemoryStore,
  config: Required<MemoryDecayConfig>
): Promise<{ decayed: number; updated: number }> {
  const graph = await store.getGraph({ status: 'active', limit: 1000 });
  const now = Date.now();
  let decayed = 0;
  let updated = 0;

  for (const node of graph.nodes) {
    const newScore = computeDecayScore(node.lastAccessedAt, now, config);
    if (newScore < config.decayThreshold) {
      await store.updateMemory(node.id, {
        decayScore: newScore,
        status: 'decayed',
      });
      decayed++;
    } else if (Math.abs(newScore - node.decayScore) > 0.01) {
      await store.updateMemory(node.id, { decayScore: newScore });
      updated++;
    }
  }

  return { decayed, updated };
}
