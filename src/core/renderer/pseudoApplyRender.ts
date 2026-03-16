/**
 * 伪元素应用渲染工具
 * 用于将 CSS 伪元素转换为实际的 HTML 元素
 */
import * as csstree from "css-tree";
import { parseOptions } from "../parser/cssParser.js";

/**
 * 伪元素类型
 */
type PseudoType = "before" | "after";

/**
 * 伪元素样式映射
 */
type PseudoStyleMap = Map<string, string>;

/**
 * 伪元素规则
 */
type PseudoRule = {
    /** before 伪元素样式 */
    before: PseudoStyleMap;
    /** after 伪元素样式 */
    after: PseudoStyleMap;
};

/**
 * 伪元素规则表
 */
type PseudoRuleTable = Map<string, PseudoRule>;

/**
 * 应用伪元素样式到元素
 * @param element 目标元素
 * @param themeCss 主题 CSS 字符串
 */
export function applyPseudoElements(element: HTMLElement, themeCss: string): void {
    // 解析 CSS 为 AST
    const ast = csstree.parse(themeCss, parseOptions);

    // 提取伪元素规则
    const rules = extractPseudoRules(ast);

    // 应用规则到匹配的元素
    rules.forEach((rule, tag) => {
        const elements = element.querySelectorAll<HTMLElement>(tag);

        elements.forEach((el) => {
            const doc = el.ownerDocument;

            // 应用 before 伪元素
            if (rule.before.size > 0) {
                el.insertBefore(buildPseudoElement(rule.before, doc), el.firstChild);
            }

            // 应用 after 伪元素
            if (rule.after.size > 0) {
                el.appendChild(buildPseudoElement(rule.after, doc));
            }
        });
    });
}

/**
 * 构建伪元素
 * @param originalResults 伪元素样式映射
 * @param document 文档对象
 * @returns 构建的伪元素
 */
function buildPseudoElement(originalResults: PseudoStyleMap, document: Document): HTMLElement {
    // 【核心修复】：克隆 Map，防止修改原始引用导致后续元素无法获取样式
    const beforeResults = new Map(originalResults);
    // 创建一个新的 <section> 元素作为伪元素容器
    const section: HTMLElement = document.createElement("section");

    // 将伪类的内容和样式应用到元素
    const content = beforeResults.get("content");
    if (content) {
        // 移除引号
        section.textContent = content.replace(/['"]/g, "");
        beforeResults.delete("content");
    }

    // 处理包含 url() 的样式
    for (const [k, v] of beforeResults) {
        if (v.includes("url(")) {
            // 匹配 SVG 数据 URL
            const svgMatch = v.match(/data:image\/svg\+xml;utf8,(.*<\/svg>)/);
            // 匹配 Base64 编码的 SVG
            const base64SvgMatch = v.match(/data:image\/svg\+xml;base64,([^"'\)]*)["']?\)/);
            // 匹配 HTTP URL
            const httpMatch = v.match(/(?:"|')?(https?[^"'\)]*)(?:"|')?\)/);

            if (svgMatch) {
                // 解码 SVG 并设置为 innerHTML
                const svgCode = decodeURIComponent(svgMatch[1]);
                section.innerHTML = svgCode;
            } else if (base64SvgMatch) {
                // 解码 Base64 SVG 并设置为 innerHTML
                // atob 是浏览器环境的全局函数
                const decodedString = atob(base64SvgMatch[1]);
                section.innerHTML = decodedString;
            } else if (httpMatch) {
                // 创建 img 元素并设置 src
                const img: HTMLImageElement = document.createElement("img");
                img.src = httpMatch[1];
                img.setAttribute("style", "vertical-align: top;");
                section.appendChild(img);
            }

            // 处理完特殊 url 样式后，将其从 Map 中删除，以免后续被作为普通 CSS 文本写入 style
            beforeResults.delete(k);
        }
    }

    // 将剩余的 Map 条目转换为 CSS 字符串
    const entries = Array.from(beforeResults.entries());
    const cssString = entries.map(([key, value]) => `${key}: ${value}`).join("; ");

    // 应用样式到 section 元素
    section.style.cssText = cssString;

    return section;
}

/**
 * 从 AST 中提取伪元素规则
 * @param ast CSS AST
 * @returns 伪元素规则表
 */
function extractPseudoRules(ast: csstree.CssNode): PseudoRuleTable {
    const table: PseudoRuleTable = new Map();

    // 遍历 AST 中的所有规则
    csstree.walk(ast, {
        visit: "Rule",
        enter(node) {
            // 生成选择器字符串
            const selector = csstree.generate(node.prelude);

            // 匹配 h1-h6、blockquote、pre 元素的伪元素
            const match = selector.match(/(^|\s)(h[1-6]|blockquote|pre)::(before|after)\b/);
            if (!match) return;

            const tag = match[2];
            const pseudo = match[3] as PseudoType;

            // 获取或创建规则记录
            let record = table.get(tag);
            if (!record) {
                record = {
                    before: new Map(),
                    after: new Map(),
                };
                table.set(tag, record);
            }

            // 提取声明到对应的伪元素样式映射
            extractDeclarations(node, record[pseudo]);
        },
    });

    return table;
}

/**
 * 从规则节点中提取声明
 * @param ruleNode 规则节点
 * @param result 结果样式映射
 */
function extractDeclarations(ruleNode: csstree.Rule, result: PseudoStyleMap): void {
    // 遍历规则块中的所有声明
    csstree.walk(ruleNode.block, {
        visit: "Declaration",
        enter(decl) {
            // 获取属性名和值
            const property = decl.property;
            const value = csstree.generate(decl.value);
            // 添加到结果映射
            result.set(property, value);
        },
    });
}
