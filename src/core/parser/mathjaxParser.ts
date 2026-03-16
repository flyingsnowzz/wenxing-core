/**
 * MathJax 解析工具
 * 使用 MathJax 库渲染数学公式
 */
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

import type { LiteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import type { MathDocument } from "mathjax-full/js/core/MathDocument.js";
import type { MathItem } from "mathjax-full/js/core/MathItem.js";

/* ---------------------------------- */
/* Types                              */
/* ---------------------------------- */

/**
 * MathJax 解析器选项接口
 */
export interface MathJaxParserOptions {
    /** 行内公式分隔符 */
    inlineMath?: [string, string][];
    /** 块级公式分隔符 */
    displayMath?: [string, string][];
    /** 字体缓存策略 */
    fontCache?: "none" | "local" | "global";
}

/* ---------------------------------- */
/* Singleton HTML Handler Guard        */
/* ---------------------------------- */

// MathJax 的 HTMLHandler 是 **全局注册的**
let htmlHandlerRegistered = false;

/* ---------------------------------- */
/* Factory                            */
/* ---------------------------------- */

/**
 * 创建 MathJax 解析器
 * @param options 解析器选项
 * @returns 包含 parser 方法的对象
 */
export function createMathJaxParser(options: MathJaxParserOptions = {}) {
    /* ---------- adaptor ---------- */

    // 创建轻量级适配器
    const adaptor: LiteAdaptor = liteAdaptor();

    // 注册 HTML 处理器（确保只注册一次）
    if (!htmlHandlerRegistered) {
        try {
            RegisterHTMLHandler(adaptor);
            htmlHandlerRegistered = true;
        } catch {
            // 已注册，忽略
        }
    }

    /* ---------- TeX / SVG ---------- */

    // 创建 TeX 输入处理器
    const tex = new TeX({
        // 行内公式分隔符，默认为 $...$ 和 \(...\)
        inlineMath: options.inlineMath ?? [
            ["$", "$"],
            ["\\(", "\\)"],
        ],
        // 块级公式分隔符，默认为 $$...$$ 和 \[...\]
        displayMath: options.displayMath ?? [
            ["$$", "$$"],
            ["\\[", "\\]"],
        ],
        // 处理转义字符
        processEscapes: true,
        // 加载所有 TeX 包
        packages: AllPackages,
    });

    // 创建 SVG 输出处理器
    const svg = new SVG({
        // 字体缓存策略，默认为 none
        fontCache: options.fontCache ?? "none",
    });

    /* ---------- helpers ---------- */

    /**
     * 为数学公式添加容器
     * @param math 数学公式项
     * @param doc 数学文档
     */
    function addContainer(math: MathItem<any, any, any>, doc: MathDocument<any, any, any>) {
        // 根据是否为块级公式选择标签
        const tag = math.display ? "section" : "span";
        // 根据是否为块级公式选择类名
        const cls = math.display ? "block-equation" : "inline-equation";

        const container = math.typesetRoot;

        // 如果有数学公式内容，添加到属性中
        if (math.math) {
            doc.adaptor.setAttribute(container, "math", math.math);
        }

        // 创建容器节点并替换原来的根节点
        const node = doc.adaptor.node(tag, { class: cls }, [container]);
        math.typesetRoot = node;
    }

    /* ---------- public API ---------- */

    return {
        /**
         * 解析包含数学公式的 HTML 字符串
         * @param htmlString 包含数学公式的 HTML 字符串
         * @returns 渲染后的 HTML 字符串
         */
        parser(htmlString: string): string {
            // 创建数学文档
            const doc = mathjax.document(htmlString, {
                InputJax: tex, // 使用 TeX 输入处理器
                OutputJax: svg, // 使用 SVG 输出处理器
                renderActions: {
                    // 添加自定义渲染动作，为数学公式添加容器
                    addContainer: [
                        190, // 优先级
                        (doc: MathDocument<any, any, any>) => {
                            // 遍历所有数学公式项并添加容器
                            for (const math of doc.math) {
                                addContainer(math, doc);
                            }
                        },
                        addContainer, // 动作函数
                    ],
                },
            });

            // 渲染文档
            doc.render();
            // 获取文档主体
            const body = adaptor.body(doc.document);
            // 返回主体的 HTML 内容
            return adaptor.innerHTML(body);
        },
    };
}