/**
 * 头条平台内容处理工具
 * 用于将文颜渲染的 HTML 转换为头条平台支持的格式
 */

/**
 * 获取处理后的 HTML 内容：将 MathJax 公式转换为内联 SVG 图片
 * @param wenyanElement 文颜渲染后的根元素
 * @returns 处理后的 HTML 字符串
 */
export function getContentForToutiao(wenyanElement: HTMLElement): string {
    // 获取所有 MathJax 容器元素
    const containers = wenyanElement.querySelectorAll<HTMLElement>("mjx-container");
    const doc = wenyanElement.ownerDocument;

    containers.forEach((container) => {
        // 获取容器内的 SVG 元素
        const svg = container.querySelector<SVGSVGElement>("svg");

        if (!svg) {
            // 如果容器是空的或没有 SVG，直接移除容器或跳过
            return;
        }

        // 创建 img 元素用于替代 SVG
        const img = doc.createElement("img");

        // 确保 svg 包含 xmlns，虽然 MathJax 通常有，但为了 SVG 规范性建议检查
        if (!svg.hasAttribute("xmlns")) {
            svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        }
        
        // 将 SVG 转换为 data URL
        const encodedSVG = encodeURIComponent(svg.outerHTML);
        img.src = `data:image/svg+xml,${encodedSVG}`;

        // MathJax 的 SVG 通常带有 vertical-align 样式用于行内对齐，需要复制给 img
        // 同时也尝试保留无障碍标签
        const style = svg.getAttribute("style");
        if (style) {
            img.setAttribute("style", style);
        } else {
            // 默认对齐兜底
            img.style.verticalAlign = "middle";
        }

        // 尝试获取无障碍标签并设置为 alt 属性
        const ariaLabel = container.getAttribute("aria-label") || container.getAttribute("title");
        if (ariaLabel) {
            img.alt = ariaLabel;
        }

        // 用 img 元素替换原 MathJax 容器
        container.replaceWith(img);
    });

    return wenyanElement.outerHTML;
}
