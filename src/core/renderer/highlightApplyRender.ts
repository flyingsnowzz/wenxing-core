/**
 * 代码高亮主题渲染工具
 * 用于将代码高亮主题应用到文档中
 */
import { createCssApplier } from "../parser/cssParser.js";

/**
 * 应用代码高亮主题到元素
 * @param wenyanElement 目标元素
 * @param highlightCss 高亮主题的 CSS 字符串
 */
export function renderHighlightTheme(wenyanElement: HTMLElement, highlightCss: string): void {
    // 创建 CSS 应用器并应用高亮主题
    createCssApplier(highlightCss)(wenyanElement);
}
