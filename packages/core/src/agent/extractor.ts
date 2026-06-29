import type { LLMProvider } from '../llm/provider.js';
import type { ChatMessage } from '../types/agent.js';
import type {
  ExtractedMemory,
  MemoryExtractor,
} from '../memory/consolidation.js';

const EXTRACTION_SYSTEM_PROMPT = `你是一个记忆提取器。从用户与助手的对话中提取值得长期记忆的信息。

提取以下类型的记忆：
- episodic: 具体事件、经历、对话要点、用户做过的事
- semantic: 事实、知识、用户偏好、个人信息、关系
- procedural: 流程、方法、操作步骤、技能

以 JSON 数组返回，每个元素：{ "type", "content", "summary", "importance" }
- type: "episodic" | "semantic" | "procedural"
- content: 完整内容描述
- summary: 一句话摘要
- importance: 0-1 重要度

只提取真正有价值的信息，忽略寒暄和无关内容。无值得记忆的内容时返回 []。
只返回 JSON 数组，不要其他文字。`;

/**
 * 基于 LLM 的记忆提取器
 *
 * 从对话中提取关键信息沉淀为长期记忆
 */
export class LLMMemoryExtractor implements MemoryExtractor {
  private llm: LLMProvider;

  constructor(llm: LLMProvider) {
    this.llm = llm;
  }

  async extract(messages: ChatMessage[]): Promise<ExtractedMemory[]> {
    if (messages.length === 0) return [];

    const dialogue = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
      .join('\n');

    if (!dialogue.trim()) return [];

    const response = await this.llm.chat(
      [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: `请从以下对话中提取记忆:\n\n${dialogue}` },
      ],
      { temperature: 0.3 }
    );

    try {
      const jsonText = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(jsonText) as ExtractedMemory[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (m) =>
          m.type &&
          m.content &&
          m.summary &&
          typeof m.importance === 'number'
      );
    } catch {
      console.error('[mnemo] 记忆提取结果解析失败:', response.content);
      return [];
    }
  }
}
