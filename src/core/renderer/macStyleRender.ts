/**
 * Mac 风格渲染工具
 * 用于为文档应用 Mac 风格的样式
 */
import { getMacStyleCss } from "../theme/macStyleRegistry.js";
import { applyPseudoElements } from "./pseudoApplyRender.js";

/**
 * 应用 Mac 风格样式到元素
 * @param wenyanElement 目标元素
 */
export function renderMacStyle(wenyanElement: HTMLElement): void {
    // 获取 Mac 风格的 CSS
    const macStyleCss = getMacStyleCss();
    // 应用伪元素样式
    applyPseudoElements(wenyanElement, macStyleCss);
}
