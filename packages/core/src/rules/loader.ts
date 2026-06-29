import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

/** 规则文件（Markdown，内容直接作为系统提示词增强） */
export interface Rule {
  name: string;
  content: string;
  scope: 'global' | 'project';
  filePath: string;
}

/**
 * Rules 加载器
 *
 * 加载全局规则（config/rules 目录）+ 项目级规则（用户自定义）
 * 规则内容作为系统提示词的一部分注入，用于约束/引导 Agent 行为
 */
export class RulesLoader {
  private globalRulesPath: string;
  private projectRules: string;

  constructor(globalRulesPath: string, projectRules: string = '') {
    this.globalRulesPath = resolve(globalRulesPath);
    this.projectRules = projectRules;
  }

  /** 加载所有规则（全局 + 项目级） */
  load(): Rule[] {
    const rules: Rule[] = [];

    // 全局规则：扫描目录下所有 .md 文件
    if (existsSync(this.globalRulesPath)) {
      const entries = readdirSync(this.globalRulesPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const filePath = join(this.globalRulesPath, entry.name);
          const content = readFileSync(filePath, 'utf-8').trim();
          if (content) {
            rules.push({
              name: entry.name.replace(/\.md$/, ''),
              content,
              scope: 'global',
              filePath,
            });
          }
        }
      }
    }

    // 项目级规则：直接使用文本内容
    if (this.projectRules.trim()) {
      rules.push({
        name: 'project',
        content: this.projectRules.trim(),
        scope: 'project',
        filePath: '(inline)',
      });
    }

    return rules;
  }

  /** 将规则格式化为系统提示词片段 */
  formatRules(rules: Rule[]): string {
    if (rules.length === 0) return '';
    const sections = rules.map(
      (r) => `### ${r.scope === 'global' ? '全局规则' : '项目规则'}: ${r.name}\n${r.content}`
    );
    return `## 行为规则\n\n${sections.join('\n\n')}`;
  }
}
