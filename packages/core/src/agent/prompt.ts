import type { ToolDefinition } from '../types/agent.js';

export interface PromptParts {
  /** 渐进式召回的记忆上下文 */
  recallContext: string;
  /** 匹配到的 skills */
  skills: Array<{ name: string; content: string }>;
  /** 格式化后的规则文本 */
  rulesText: string;
  /** 可用工具列表 */
  tools: ToolDefinition[];
}

/**
 * 构建系统提示词
 *
 * 组合：基础人设 + 记忆上下文 + 行为规则 + Skills + 工具说明
 */
export function buildSystemPrompt(parts: PromptParts): string {
  const sections: string[] = [
    '# Mnemo — 个人助理 Agent',
    '',
    '你是 Mnemo，一个具有人类记忆机制的个人助理。',
    '你通过记忆图关联渐进式回忆相关记忆（模拟人类联想），支持 Skills、MCP 工具和 Rules。',
    '请结合相关记忆和可用工具，为用户提供精准、有记忆连贯性的帮助。',
  ];

  if (parts.recallContext) {
    sections.push(parts.recallContext);
  }

  if (parts.rulesText) {
    sections.push(parts.rulesText);
  }

  if (parts.skills.length > 0) {
    const skillSections = parts.skills.map(
      (s) => `### Skill: ${s.name}\n${s.content}`
    );
    sections.push(`## 可用 Skills\n\n${skillSections.join('\n\n')}`);
  }

  if (parts.tools.length > 0) {
    const toolList = parts.tools.map(
      (t) => `- \`${t.function.name}\`: ${t.function.description}`
    );
    sections.push(
      `## 可用工具\n\n${toolList.join('\n')}\n\n你可以通过函数调用使用上述工具完成任务。`
    );
  }

  return sections.join('\n\n');
}
