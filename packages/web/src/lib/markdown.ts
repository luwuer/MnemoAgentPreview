import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

/** 配置 markdown-it 实例（支持代码高亮） */
export const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`;
      } catch {
        // ignore
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

/** 渲染 markdown 为 HTML */
export function renderMarkdown(content: string): string {
  return md.render(content);
}
