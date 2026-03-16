/**
 * HTTP 适配器接口定义
 * 用于抽象不同环境下的 HTTP 请求实现
 */

/**
 * 多部分表单数据体
 */
export interface MultipartBody {
    /** 请求体 */
    body: BodyInit;
    /** 请求头 */
    headers?: Record<string, string>;
}

/**
 * HTTP 适配器接口
 * 定义了 HTTP 请求相关的方法
 */
export interface HttpAdapter {
    /**
     * 发送 HTTP 请求
     * @param input 请求 URL 或 Request 对象
     * @param init 请求配置
     * @returns 响应对象
     */
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;

    /**
     * 创建多部分表单数据
     * @param field 表单字段名
     * @param file 文件 Blob 对象
     * @param filename 文件名
     * @returns 多部分表单数据体
     */
    createMultipart(field: string, file: Blob, filename: string): MultipartBody;
}
