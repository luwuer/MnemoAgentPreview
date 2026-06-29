import type { Skill } from './loader.js';

/**
 * Skill 匹配器
 *
 * 根据用户输入匹配相关 skill，将匹配到的 skill 内容注入上下文
 */
export class SkillsMatcher {
  private skills: Skill[];

  constructor(skills: Skill[]) {
    this.skills = skills.filter((s) => s.enabled);
  }

  /**
   * 匹配 skill
   * 匹配规则：
   * 1. trigger 关键词命中（任一命中即匹配）
   * 2. description 关键词命中
   * 3. 无 trigger 的 skill 视为通用 skill，总是匹配
   */
  match(input: string): Skill[] {
    const lowerInput = input.toLowerCase();
    const matched: Skill[] = [];

    for (const skill of this.skills) {
      // 有 trigger 的 skill：关键词命中即匹配
      if (skill.triggers && skill.triggers.length > 0) {
        const hit = skill.triggers.some((t) =>
          lowerInput.includes(t.toLowerCase())
        );
        if (hit) matched.push(skill);
      } else if (this.descriptionMatch(lowerInput, skill.description)) {
        // 无 trigger 但 description 关键词命中
        matched.push(skill);
      }
    }

    return matched;
  }

  private descriptionMatch(input: string, description: string): boolean {
    if (!description) return false;
    // 从 description 提取关键词（简单分词）
    const keywords = description
      .toLowerCase()
      .split(/[\s,，、。]+/)
      .filter((w) => w.length > 1);
    return keywords.some((k) => input.includes(k));
  }

  /** 获取所有已启用的 skill（用于展示） */
  getAll(): Skill[] {
    return [...this.skills];
  }
}
