/**
 * 文颜核心模块
 * 提供 Markdown 渲染、样式应用等核心功能
 */
import { monospace, resolveCssContent, sansSerif } from "./utils.js";
import { registerBuiltInHlThemes, getHlTheme, getAllHlThemes } from "./theme/hlThemeRegistry.js";
import { addFootnotes } from "./renderer/footnotesRender.js";
import { FrontMatterResult, handleFrontMatter } from "./parser/frontMatterParser.js";
import { renderHighlightTheme } from "./renderer/highlightApplyRender.js";
import { renderMacStyle } from "./renderer/macStyleRender.js";
import { createMarkedClient } from "./parser/markedParser.js";
import { createMathJaxParser } from "./parser/mathjaxParser.js";
import { wechatPostRender } from "./renderer/wechatPostRender.js";
import { renderTheme } from "./renderer/themeApplyRender.js";
import { registerAllBuiltInThemes, getTheme, getAllGzhThemes } from "./theme/themeRegistry.js";
import { applyPseudoElements } from "./renderer/pseudoApplyRender.js";
import { createCssModifier, CssUpdateMap } from "./parser/cssParser.js";
import { registerBuiltInMacStyle } from "./theme/macStyleRegistry.js";

/**
 * 文颜初始化选项
 */
export interface WenyanOptions {
    /** 是否转换 MathJax 公式 */
    isConvertMathJax?: boolean;
    /** 是否为微信公众号格式 */
    isWechat?: boolean;
}

/**
 * 应用样式选项
 */
export interface ApplyStylesOptions {
    /** 主题 ID */
    themeId?: string;
    /** 代码高亮主题 ID */
    hlThemeId?: string;
    /** 主题 CSS 字符串 */
    themeCss?: string;
    /** 代码高亮主题 CSS 字符串 */
    hlThemeCss?: string;
    /** 是否应用 Mac 风格 */
    isMacStyle?: boolean;
    /** 是否添加脚注 */
    isAddFootnote?: boolean;
}

/**
 * 创建文颜核心实例
 * @param options 初始化选项
 * @returns 文颜核心实例
 */
export async function createWenyanCore(options: WenyanOptions = {}) {
    const { isConvertMathJax = true, isWechat = true } = options;
    // 创建 Marked 解析客户端
    const markedClient = createMarkedClient();
    // 创建 MathJax 解析器
    const mathJaxParser = createMathJaxParser();
    // 注册内置主题
    registerAllBuiltInThemes();
    // 注册内置代码高亮主题
    registerBuiltInHlThemes();
    // 注册内置 Mac 风格
    registerBuiltInMacStyle();
    
    return {
        /**
         * 处理 Markdown 中的 Front Matter
         * @param markdown Markdown 字符串
         * @returns 处理结果
         */
        async handleFrontMatter(markdown: string): Promise<FrontMatterResult> {
            return await handleFrontMatter(markdown);
        },
        
        /**
         * 渲染 Markdown 为 HTML
         * @param markdown Markdown 字符串
         * @returns 渲染后的 HTML 字符串
         */
        async renderMarkdown(markdown: string): Promise<string> {
            // 使用 Marked 解析 Markdown
            const html = await markedClient.parse(markdown);
            // 如果需要转换 MathJax 公式
            if (isConvertMathJax) {
                return mathJaxParser.parser(html);
            }
            return html;
        },
        
        /**
         * 使用主题应用样式
         * @param wenyanElement 目标元素
         * @param options 样式选项
         * @returns 应用样式后的 HTML 字符串
         */
        async applyStylesWithTheme(wenyanElement: HTMLElement, options: ApplyStylesOptions = {}): Promise<string> {
            const {
                themeId = "default", // 默认主题
                themeCss, // 自定义主题 CSS
                hlThemeId = "solarized-light", // 默认代码高亮主题
                hlThemeCss, // 自定义代码高亮主题 CSS
                isMacStyle = true, // 默认应用 Mac 风格
                isAddFootnote = true, // 默认添加脚注
            } = options;
            
            // 并行解析主题和代码高亮主题
            const [resolvedThemeCss, resolvedHlThemeCss] = await Promise.all([
                // 任务 1: 解析文章主题
                resolveCssContent(
                    themeCss,
                    themeId,
                    getTheme,
                    (id) => getAllGzhThemes().find((t) => t.meta.name.toLowerCase() === id.toLowerCase()),
                    `主题不存在: ${themeId}`,
                ),
                // 任务 2: 解析代码高亮主题
                resolveCssContent(
                    hlThemeCss,
                    hlThemeId,
                    getHlTheme,
                    (id) => getAllHlThemes().find((t) => t.id.toLowerCase() === id.toLowerCase()),
                    `代码主题不存在: ${hlThemeId}`,
                ),
            ]);
            
            // 应用默认 CSS 更新
            const modifiedCss = createCssModifier(DEFAULT_CSS_UPDATES)(resolvedThemeCss);
            
            // 调用 applyStylesWithResolvedCss 应用样式
            return this.applyStylesWithResolvedCss(wenyanElement, {
                themeCss: modifiedCss,
                hlThemeCss: resolvedHlThemeCss,
                isMacStyle,
                isAddFootnote,
            });
        },
        
        /**
         * 使用已解析的 CSS 应用样式
         * @param wenyanElement 目标元素
         * @param options 样式选项
         * @returns 应用样式后的 HTML 字符串
         */
        async applyStylesWithResolvedCss(
            wenyanElement: HTMLElement,
            options: {
                themeCss: string;
                hlThemeCss: string;
                isMacStyle: boolean;
                isAddFootnote: boolean;
            },
        ): Promise<string> {
            const { themeCss = "", hlThemeCss = "", isMacStyle = true, isAddFootnote = true } = options;
            
            // 验证元素是否存在
            if (!wenyanElement) {
                throw new Error("wenyanElement不能为空");
            }
            
            // 添加脚注
            if (isAddFootnote) {
                addFootnotes(wenyanElement);
            }
            
            // 应用 Mac 风格
            if (isMacStyle) {
                renderMacStyle(wenyanElement);
            }
            
            // 应用主题样式和伪元素
            if (themeCss) {
                renderTheme(wenyanElement, themeCss);
                applyPseudoElements(wenyanElement, themeCss);
            }
            
            // 应用代码高亮主题
            if (hlThemeCss) {
                renderHighlightTheme(wenyanElement, hlThemeCss);
            }
            
            // 为微信公众号格式做特殊处理
            if (isWechat) {
                wechatPostRender(wenyanElement);
                wenyanElement.setAttribute("data-provider", "WenYan");
                // 处理 MathJax 样式和列表格式
                return `${wenyanElement.outerHTML
                    .replace(/class="mjx-solid"/g, 'fill="none" stroke-width="70"')
                    .replace(/\n<li/g, "<li")
                    .replace(/<\/li>\n/g, "<\/li>")}`;
            }
            
            return wenyanElement.outerHTML;
        },
    };
}

/**
 * 默认 CSS 更新配置
 */
const DEFAULT_CSS_UPDATES: CssUpdateMap = {
    "#wenyan": [
        {
            property: "font-family",
            value: sansSerif,
            append: false,
        },
    ],
    "#wenyan pre": [
        {
            property: "font-size",
            value: "12px",
            append: false,
        },
    ],
    "#wenyan pre code": [
        {
            property: "font-family",
            value: monospace,
            append: false,
        },
    ],
    "#wenyan p code": [
        {
            property: "font-family",
            value: monospace,
            append: false,
        },
    ],
    "#wenyan li code": [
        {
            property: "font-family",
            value: monospace,
            append: false,
        },
    ],
};

// 导出其他模块的功能
export * from "./theme/themeRegistry.js";
export * from "./theme/hlThemeRegistry.js";
export { serif, sansSerif, monospace } from "./utils.js";
export { createCssModifier } from "./parser/cssParser.js";
export { getMacStyleCss, registerMacStyle } from "./theme/macStyleRegistry.js";
export * from "./platform/medium.js";
export * from "./platform/zhihu.js";
export * from "./platform/toutiao.js";
export { addFootnotes } from "./renderer/footnotesRender.js";
