/**
 * 微信公众号客户端模块
 * 提供微信公众号相关的 API 调用功能
 */
import type { HttpAdapter } from "./http.js";

// 微信 API 接口地址
const tokenUrl = "https://api.weixin.qq.com/cgi-bin/token"; // 获取访问令牌
const publishUrl = "https://api.weixin.qq.com/cgi-bin/draft/add"; // 发布草稿
const uploadUrl = "https://api.weixin.qq.com/cgi-bin/material/add_material"; // 上传素材

/**
 * 微信公众号发布选项
 */
export interface WechatPublishOptions {
    /** 文章标题 */
    title: string;
    /** 作者 */
    author?: string;
    /** 文章内容 */
    content: string;
    /** 缩略图媒体 ID */
    thumb_media_id: string;
    /** 原文链接 */
    content_source_url?: string;
}

/**
 * 微信 API 错误响应
 */
export interface WechatErrorResponse {
    /** 错误码 */
    errcode: number;
    /** 错误信息 */
    errmsg: string;
}

/**
 * 微信素材上传响应
 */
export interface WechatUploadResponse {
    /** 媒体 ID */
    media_id: string;
    /** 素材 URL */
    url: string;
}

/**
 * 微信访问令牌响应
 */
export interface WechatTokenResponse {
    /** 访问令牌 */
    access_token: string;
    /** 过期时间（秒） */
    expires_in: number;
}

/**
 * 微信发布文章响应
 */
export interface WechatPublishResponse {
    /** 媒体 ID */
    media_id: string;
}

// 类型别名
type UploadResult = WechatUploadResponse | WechatErrorResponse;
type TokenResult = WechatTokenResponse | WechatErrorResponse;
type PublishResult = WechatPublishResponse | WechatErrorResponse;

/**
 * 创建微信客户端
 * @param adapter HTTP 适配器
 * @returns 微信客户端
 */
export function createWechatClient(adapter: HttpAdapter) {
    return {
        /**
         * 获取微信访问令牌
         * @param appId 微信公众号 App ID
         * @param appSecret 微信公众号 App Secret
         * @returns 访问令牌响应
         */
        async fetchAccessToken(appId: string, appSecret: string): Promise<WechatTokenResponse> {
            const res = await adapter.fetch(
                `${tokenUrl}?grant_type=client_credential&appid=${appId}&secret=${appSecret}`,
            );
            if (!res.ok) throw new Error(await res.text());

            const data: TokenResult = await res.json();
            assertWechatSuccess(data);
            return data;
        },

        /**
         * 上传素材
         * @param type 素材类型
         * @param file 文件 Blob
         * @param filename 文件名
         * @param accessToken 访问令牌
         * @returns 上传响应
         */
        async uploadMaterial(
            type: string,
            file: Blob,
            filename: string,
            accessToken: string,
        ): Promise<WechatUploadResponse> {
            const multipart = adapter.createMultipart("media", file, filename);

            const res = await adapter.fetch(`${uploadUrl}?access_token=${accessToken}&type=${type}`, {
                ...multipart,
                method: "POST",
            });

            if (!res.ok) throw new Error(await res.text());

            const data: UploadResult = await res.json();
            assertWechatSuccess(data);

            // 确保 URL 使用 HTTPS
            if (data.url.startsWith("http://")) {
                data.url = data.url.replace(/^http:\/\//i, "https://");
            }

            return data;
        },

        /**
         * 发布文章到微信公众号
         * @param accessToken 访问令牌
         * @param options 发布选项
         * @returns 发布响应
         */
        async publishArticle(accessToken: string, options: WechatPublishOptions): Promise<WechatPublishResponse> {
            const res = await adapter.fetch(`${publishUrl}?access_token=${accessToken}`, {
                method: "POST",
                body: JSON.stringify({
                    articles: [options],
                }),
            });

            if (!res.ok) throw new Error(await res.text());

            const data: PublishResult = await res.json();
            assertWechatSuccess(data);
            return data;
        },
    };
}

/**
 * 断言微信 API 响应成功
 * @param data 响应数据
 * @throws 如果响应包含错误信息
 */
function assertWechatSuccess<T extends object>(data: T | WechatErrorResponse): asserts data is T {
    if ("errcode" in data) {
        throw new Error(`${data.errcode}: ${data.errmsg}`);
    }
}

/**
 * 微信客户端类型
 */
export type WechatClient = ReturnType<typeof createWechatClient>;
