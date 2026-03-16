/**
 * CSS 解析和修改工具
 * 提供 CSS 规则的解析、修改和应用功能
 */
import * as csstree from "css-tree";

/**
 * CSS 属性更新配置
 */
type CssUpdate = {
    /** CSS 属性名 */
    property: string;
    /** CSS 属性值 */
    value?: string;
    /** 是否追加属性（true: 永远追加, false: 仅不存在时追加） */
    append?: boolean;
};

/**
 * CSS 更新映射表
 * 键为选择器，值为该选择器下的属性更新列表
 */
export type CssUpdateMap = Record<string, CssUpdate[]>;

/**
 * CSS 解析选项
 */
export const parseOptions: csstree.ParseOptions = {
    context: "stylesheet", // 解析上下文为样式表
    positions: false, // 不保留位置信息
    parseAtrulePrelude: false, // 不解析 @ 规则的前导部分
    parseCustomProperty: false, // 不解析自定义属性
    parseValue: false, // 不解析值
};

/**
 * 创建 CSS 修改函数
 * @param updates CSS 更新映射表
 * @returns 修改 CSS 的函数
 */
export function createCssModifier(updates: CssUpdateMap) {
    /**
     * 修改 CSS 字符串
     * @param customCss 原始 CSS 字符串
     * @returns 修改后的 CSS 字符串
     */
    return function modifyCss(customCss: string): string {
        // 解析 CSS 为 AST
        const ast = csstree.parse(customCss, parseOptions);

        // 遍历 AST 中的所有规则
        csstree.walk(ast, {
            visit: "Rule",
            leave(node) {
                // 确保规则有选择器列表
                if (node.prelude?.type !== "SelectorList") return;

                // 获取该规则包含的所有选择器字符串
                const selectors = node.prelude.children.toArray().map((sel) => csstree.generate(sel));

                if (selectors.length > 0) {
                    // 使用 Map 来去重，如果多个选择器定义了相同属性，后者会覆盖前者
                    const mergedUpdates = new Map<string, CssUpdate>();

                    // 收集所有需要更新的属性
                    selectors.forEach((sel) => {
                        const updateList = updates[sel];
                        if (updateList) {
                            updateList.forEach((update) => {
                                // 以属性名(property)为 key 进行合并
                                mergedUpdates.set(update.property, update);
                            });
                        }
                    });

                    // 如果没有任何更新需要应用，直接返回
                    if (mergedUpdates.size === 0) return;

                    // 应用合并后的更新
                    for (const { property, value, append } of mergedUpdates.values()) {
                        if (value) {
                            let found = false;

                            // 查找并替换现有属性
                            csstree.walk(node.block, (decl) => {
                                if (decl.type === "Declaration" && decl.property === property) {
                                    found = true;
                                }
                            });

                            // 确定是否需要追加属性
                            // append = true → 永远追加
                            // append = false → 仅在不存在时追加
                            const shouldAppend = append === true || (append === false && !found);
                            if (shouldAppend && value) {
                                // 创建新的属性声明并添加到规则块的开头
                                const newItem = node.block.children.createItem({
                                    type: "Declaration",
                                    property,
                                    value: csstree.parse(value, { context: "value" }) as csstree.Value,
                                    important: false,
                                });
                                node.block.children.prepend(newItem);
                            }
                        }
                    }
                }
            },
        });

        // 生成修改后的 CSS 字符串
        return csstree.generate(ast);
    };
}

/**
 * 创建 CSS 应用函数
 * @param css CSS 字符串
 * @returns 应用 CSS 到 DOM 元素的函数
 */
export function createCssApplier(css: string) {
    // 解析 CSS 为 AST
    const ast = csstree.parse(css, parseOptions);
    
    /**
     * 应用 CSS 到 DOM 元素
     * @param element 目标 DOM 元素
     */
    return function applyToElement(element: HTMLElement): void {
        // 遍历 AST 中的所有规则
        csstree.walk(ast, {
            visit: "Rule",
            enter(node) {
                // 确保规则有选择器列表
                if (node.prelude.type !== "SelectorList") return;

                // 获取规则中的所有声明
                const declarations = node.block.children.toArray();

                // 遍历每个选择器
                node.prelude.children.forEach((selectorNode) => {
                    const selector = csstree.generate(selectorNode);
                    // 安全性检查：跳过伪类/伪元素，防止 querySelectorAll 报错或逻辑错误
                    if (selector.includes(":")) return;
                    
                    // 根节点特殊处理
                    const targets = 
                        selector === "#wenyan"
                            ? [element]
                            : Array.from(element.querySelectorAll<HTMLElement>(selector));

                    // 应用样式到所有匹配的元素
                    targets.forEach((el) => {
                        declarations.forEach((decl) => {
                            if (decl.type !== "Declaration") return;
                            
                            // 生成属性值
                            let value = csstree.generate(decl.value);
                            
                            // 获取属性名和优先级
                            const property = decl.property;
                            const priority = decl.important ? "important" : "";

                            // 使用 setProperty 接口应用样式
                            el.style.setProperty(property, value, priority);
                        });
                    });
                });
            },
        });
    };
}
