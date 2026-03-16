/**
 * 脚注渲染工具
 * 用于为文档中的链接添加脚注
 */

/**
 * 为元素中的链接添加脚注
 * @param element 目标元素
 * @param listStyle 是否使用列表样式渲染脚注
 */
export function addFootnotes(element: HTMLElement, listStyle: boolean = false): void {
    // 存储脚注信息：[脚注编号, 链接文本, 链接地址]
    const footnotes: Array<[number, string, string]> = [];
    // 脚注计数器
    let footnoteIndex = 0;
    // 获取所有带有 href 的 a 元素
    const links = element.querySelectorAll<HTMLAnchorElement>("a[href]");
    
    links.forEach((linkElement) => {
        // 获取链接文本
        const title = linkElement.textContent || linkElement.innerText;
        // 获取链接地址
        const href = linkElement.getAttribute("href") || "";

        // 添加脚注并获取脚注编号
        footnotes.push([++footnoteIndex, title, href]);

        // 在链接后插入脚注标记
        const footnoteMarker = element.ownerDocument.createElement("sup");
        footnoteMarker.setAttribute("class", "footnote");
        footnoteMarker.innerHTML = `[${footnoteIndex}]`;
        linkElement.after(footnoteMarker);
    });
    
    // 如果没有脚注，直接返回
    if (footnoteIndex === 0) return;

    // 根据样式类型渲染脚注
    const footnotesHtml = listStyle ? renderListStyleFootnotes(footnotes) : renderParagraphStyleFootnotes(footnotes);

    // 将脚注添加到元素末尾
    element.insertAdjacentHTML("beforeend", footnotesHtml);
}

/**
 * 渲染段落样式的脚注
 * @param footnotes 脚注信息数组
 * @returns 渲染后的 HTML 字符串
 */
function renderParagraphStyleFootnotes(footnotes: Array<[number, string, string]>): string {
    // 生成每个脚注的 HTML
    const items = footnotes.map(([index, title, href]) => {
        if (title === href) {
            // 如果链接文本和地址相同，只显示一个
            return `<p><span class="footnote-num">[${index}]</span><span class="footnote-txt"><i>${title}</i></span></p>`;
        }
        // 否则显示链接文本和地址
        return `<p><span class="footnote-num">[${index}]</span><span class="footnote-txt">${title}: <i>${href}</i></span></p>`;
    });

    // 包装脚注并返回
    return `<h3>引用链接</h3><section id="footnotes">${items.join("")}</section>`;
}

/**
 * 渲染列表样式的脚注
 * @param footnotes 脚注信息数组
 * @returns 渲染后的 HTML 字符串
 */
function renderListStyleFootnotes(footnotes: Array<[number, string, string]>): string {
    // 生成每个脚注的 HTML
    const items = footnotes.map(([index, title, href]) => {
        if (title === href) {
            // 如果链接文本和地址相同，只显示一个
            return `<li id="footnote-${index}">[${index}]: <i>${title}</i></li>`;
        }
        // 否则显示链接文本和地址
        return `<li id="footnote-${index}">[${index}] ${title}: <i>${href}</i></li>`;
    });

    // 包装脚注并返回
    return `<h3>引用链接</h3><div id="footnotes"><ul>${items.join("")}</ul></div>`;
}
