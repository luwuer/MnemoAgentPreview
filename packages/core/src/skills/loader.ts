import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import matter from 'gray-matter';

/** Skill 定义（Markdown + YAML frontmatter） */
export interface Skill {
  name: string;
  description: string;
  /** 触发关键词（用于匹配） */
  triggers?: string[];
  /** Skill 正文内容（Markdown） */
  content: string;
  /** 源文件路径 */
  filePath: string;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * Skill 加载器
 *
 * 扫描指定目录下的 skill 定义文件（.md），解析 YAML frontmatter + 正文
 * 支持两种结构：
 *   1. skills/skill-name.md
 *   2. skills/skill-name/skill.md
 */
export class SkillsLoader {
  private directory: string;
  private enabledSet: Set<string>;

  constructor(directory: string, enabled: string[] = []) {
    this.directory = resolve(directory);
    this.enabledSet = new Set(enabled);
  }

  /** 加载目录下所有 skill */
  load(): Skill[] {
    if (!existsSync(this.directory)) {
      console.error(`[mnemo] Skills 目录不存在: ${this.directory}`);
      return [];
    }

    const skills: Skill[] = [];
    const entries = readdirSync(this.directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = join(this.directory, entry.name);
        const skill = this.parseSkill(filePath);
        if (skill) skills.push(skill);
      } else if (entry.isDirectory()) {
        // skills/skill-name/skill.md
        const skillFile = join(this.directory, entry.name, 'skill.md');
        if (existsSync(skillFile)) {
          const skill = this.parseSkill(skillFile);
          if (skill) skills.push(skill);
        }
      }
    }

    return skills;
  }

  private parseSkill(filePath: string): Skill | null {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const { data, content } = matter(raw);
      const name = (data.name as string) || '';
      if (!name) {
        console.error(`[mnemo] Skill 缺少 name 字段: ${filePath}`);
        return null;
      }
      return {
        name,
        description: (data.description as string) ?? '',
        triggers: Array.isArray(data.triggers) ? data.triggers : undefined,
        content: content.trim(),
        filePath,
        enabled: this.enabledSet.size === 0 || this.enabledSet.has(name),
      };
    } catch (e) {
      console.error(`[mnemo] 解析 Skill 失败: ${filePath}`, e);
      return null;
    }
  }
}
