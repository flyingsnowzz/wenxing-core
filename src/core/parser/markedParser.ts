/**
 * Markdown 解析工具
 * 使用 Marked 库解析 Markdown 并添加自定义扩展
 */
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { stringToMap } from "../utils.js";
import type { Tokens, Renderer } from "marked";

/**
 * 创建 Marked 解析客户端
 * @returns 包含 parse 方法的对象
 */
export function createMarkedClient() {
    // 配置 Promise，用于确保配置只执行一次
    let configurePromise: Promise<void> | null = null;
    // 创建 Marked 实例
    const md = new Marked();

    /**
     * 配置 Marked 实例
     * @returns 配置完成的 Promise
     */
    async function configure(): Promise<void> {
        // 如果已经有配置 Promise，直接返回
        if (configurePromise) {
            return configurePromise;
        }

        // 创建配置 Promise
        configurePromise = (async () => {
            // ----------- 1. 代码高亮扩展 -----------
            const highlightExtension = markedHighlight({
                emptyLangClass: "hljs", // 空语言时使用的类名
                langPrefix: "hljs language-", // 语言类名前缀
                /**
                 * 代码高亮函数
                 * @param code 代码内容
                 * @param lang 语言名称
                 * @returns 高亮后的代码 HTML
                 */
                highlight(code, lang) {
                    // 如果指定的语言不存在，使用 plaintext
                    const language = hljs.getLanguage(lang) ? lang : "plaintext";
                    return hljs.highlight(code, { language }).value;
                },
            });

            // 使用代码高亮扩展
            md.use(highlightExtension);

            // ----------- 2. 自定义图片语法扩展 ![](){...} -----------
            md.use({
                extensions: [
                    {
                        name: "attributeImage",
                        level: "inline",
                        /**
                         * 查找图片语法的起始位置
                         * @param src 源文本
                         * @returns 起始位置索引
                         */
                        start(src) {
                            return src.match(/!\[/)?.index;
                        },
                        /**
                         * 解析图片语法
                         * @param src 源文本
                         * @returns 图片 token 或 undefined
                         */
                        tokenizer(src) {
                            // 匹配格式: ![alt](href){attrs}
                            // 1. ![  2. alt  3. ](  4. href  5. ){  6. attrs  7. }
                            const rule = /^!\[([^\]]*)\]\(([^)]+)\)\{([^}]+)\}/;
                            const match = rule.exec(src);

                            if (match) {
                                return {
                                    type: "attributeImage",
                                    raw: match[0],
                                    text: match[1], // alt 文本
                                    href: match[2], // 图片链接
                                    attrs: match[3], // 属性字符串
                                    tokens: [], // 作为 inline token
                                };
                            }
                            return undefined;
                        },
                        /**
                         * 渲染图片 token
                         * @param token 图片 token
                         * @returns 渲染后的 HTML
                         */
                        renderer(token) {
                            // 将属性字符串转换为 Map
                            const attrs = stringToMap(token.attrs);
                            // 生成样式字符串
                            const styleStr = Array.from(attrs)
                                .map(([k, v]) => (/^\d+$/.test(v) ? `${k}:${v}px` : `${k}:${v}`))
                                .join("; ");

                            // 生成图片 HTML
                            return `<img src="${token.href}" alt="${token.text || ""}" title="${token.text || ""}" style="${styleStr}">`;
                        },
                    },
                ],
            });

            // ----------- 3. 自定义渲染器 -----------
            md.use({
                renderer: {
                    /**
                     * 重写标题渲染
                     * @param token 标题 token
                     * @returns 渲染后的 HTML
                     */
                    heading(this: Renderer, token: Tokens.Heading) {
                        const text = this.parser.parseInline(token.tokens);
                        const level = token.depth;
                        return `<h${level}><span>${text}</span></h${level}>
`;
                    },

                    /**
                     * 重写段落渲染（处理行间公式）
                     * @param token 段落 token
                     * @returns 渲染后的 HTML
                     */
                    paragraph(this: Renderer, token: Tokens.Paragraph) {
                        const text = token.text;

                        // 正则：匹配 $$...$$ 或 \[...\]
                        // 逻辑：如果段落包含块级公式，且文本较长（避免误判），则移除 <p> 标签
                        const hasBlockMath = 
                            text.length > 4 && (/(\$\$[\s\S]*?\$\$)|(\\\[[\s\S]*?\\\])/g.test(text));

                        if (hasBlockMath) {
                            // 如果包含块级公式，直接返回文本（不包裹 p 标签）
                            // 注意：这里不 parseInline，因为公式通常需要原样输出给 MathJax/KaTeX
                            return `${text}
`;
                        } else {
                            // 正常段落，包裹 <p>，并递归解析内部 Token
                            return `<p>${this.parser.parseInline(token.tokens)}</p>
`;
                        }
                    },

                    /**
                     * 重写普通图片渲染
                     * @param token 图片 token
                     * @returns 渲染后的 HTML
                     */
                    image(this: Renderer, token: Tokens.Image) {
                        return `<img src="${token.href}" alt="${token.text || ""}" title="${token.title || token.text || ""}">`;
                    },
                },
            });
        })();

        return configurePromise;
    }

    return {
        /**
         * 解析 Markdown 为 HTML
         * @param markdown Markdown 字符串
         * @returns 解析后的 HTML 字符串
         */
        async parse(markdown: string): Promise<string> {
            await configure();
            // marked.parse 返回可能是 string | Promise<string>，这里强制转为 Promise 处理
            return md.parse(markdown) as Promise<string>;
        },
    };
}