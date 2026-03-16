/**
 * 知乎平台内容处理工具
 * 用于将文颜渲染的 HTML 转换为知乎平台支持的格式
 */

/**
 * 获取处理后的 HTML 内容：将 MathJax 公式转换为占位图片
 * @param wenyanElement 文颜渲染后的根元素
 * @returns 处理后的 HTML 字符串
 */
export function getContentForZhihu(wenyanElement: HTMLElement): string {
    // 获取所有 MathJax 容器元素
    const elements = wenyanElement.querySelectorAll<HTMLElement>("mjx-container");
    const doc = wenyanElement.ownerDocument;
    
    elements.forEach((element) => {
        // 获取公式源码
        const math = element.getAttribute("math");
        if (!math) return;
        
        // 创建 img 元素作为公式占位符
        const img = doc.createElement("img");
        // 将公式源码放入 alt，供后续处理
        img.alt = math;
        // 使用 dataset API 设置 data-eeimg 属性，知乎平台可能需要此属性
        img.dataset.eeimg = "true";
        // 设置图片样式，确保居中显示
        img.style.cssText = "margin: 0 auto; width: auto; max-width: 100%; display: block;";
        // 用 img 元素替换原 MathJax 容器
        element.replaceWith(img);
    });
    
    return wenyanElement.outerHTML;
}
