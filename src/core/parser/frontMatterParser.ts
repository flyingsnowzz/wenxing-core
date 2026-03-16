/**
 * Front Matter 解析工具
 * 处理 Markdown 文件中的前置元数据
 */
import fm from "front-matter";

/**
 * Front Matter 解析结果接口
 */
export interface FrontMatterResult {
    /** 处理后的 Markdown 正文 */
    body: string;
    /** 文章标题 */
    title?: string;
    /** 文章封面图片 URL */
    cover?: string;
    /** 文章描述 */
    description?: string;
    /** 文章作者 */
    author?: string;
    /** 文章来源 URL */
    source_url?: string;
}

/**
 * 处理 Markdown 中的 Front Matter
 * @param markdown 原始 Markdown 字符串
 * @returns 解析结果，包含正文和提取的元数据
 */
export async function handleFrontMatter(markdown: string): Promise<FrontMatterResult> {
    // 解析 Front Matter
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const { attributes, body } = fm(markdown);
    
    // 初始化结果对象
    const result: FrontMatterResult = { body: body || "" };
    
    // 用于存储描述等需要添加到正文开头的内容
    let head = "";
    
    // 提取元数据
    const { title, description, cover, author, source_url } = attributes;
    
    // 处理标题
    if (title) {
        result.title = title;
    }
    
    // 处理描述（添加为引用块到正文开头）
    if (description) {
        head += "> " + description + "\n\n";
        result.description = description;
    }
    
    // 处理封面图片
    if (cover) {
        result.cover = cover;
    }
    
    // 将描述等内容添加到正文开头
    if (head) {
        result.body = head + result.body;
    }
    
    // 处理作者信息
    if (author) {
        result.author = author;
    }
    
    // 处理来源 URL
    if (source_url) {
        result.source_url = source_url;
    }
    
    return result;
}
