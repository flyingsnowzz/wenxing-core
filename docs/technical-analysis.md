# 文颜核心库 (Wenyan Core) 技术分析报告

> 分析日期：2026-03-16
> 项目版本：2.0.8
> 分析人：技术分析助手

---

## 一、项目概述

### 1.1 项目定位

**文颜核心库 (@wenyan-md/core)** 是一套多平台 Markdown 排版与发布工具链的核心引擎。它专注于：

- **Markdown → HTML 渲染**：支持标准 Markdown 语法及扩展语法
- **主题排版**：提供公众号/Web 多种主题样式
- **代码高亮与样式增强**：支持多种代码高亮主题
- **发布前内容处理**：脚注、图片、样式兼容性处理
- **多平台适配**：微信公众号、知乎、头条、Medium 等

### 1.2 适用场景

- 在 Node.js / Web 项目中嵌入排版能力
- 构建 CLI / 桌面端 / MCP / AI 写作系统
- 自定义 Markdown 排版或内容发布流程
- 作为文颜生态的二次开发基础

---

## 二、架构设计分析

### 2.1 整体架构

项目采用**分层架构 + 模块化设计**，整体架构如下：

```
┌─────────────────────────────────────────────────────────────────┐
│                        应用层 (Application)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   CLI/桌面端   │  │   Web App    │  │   MCP/AI 写作系统     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                        Node 环境层 (Node Layer)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   publish    │  │   wrapper    │  │   render             │   │
│  │  (发布模块)   │  │  (兼容层)     │  │  (渲染模块)           │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  tokenStore  │  │uploadCache   │  │  configStore         │   │
│  │  (令牌缓存)   │  │ (上传缓存)    │  │  (配置存储)           │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                        核心层 (Core Layer)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Parser 解析器模块                      │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────┐ │   │
│  │  │ marked     │ │ mathjax    │ │ css        │ │frontMatter│ │
│  │  │ Parser     │ │ Parser     │ │ Parser     │ │ Parser  │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Renderer 渲染器模块                     │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────┐ │   │
│  │  │ theme      │ │ highlight  │ │ macStyle   │ │wechat  │ │   │
│  │  │ Apply      │ │ Apply      │ │ Render     │ │Post    │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────┘ │   │
│  │  ┌────────────┐ ┌────────────┐                            │   │
│  │  │ footnotes  │ │ pseudo     │                            │   │
│  │  │ Render     │ │ Apply      │                            │   │
│  │  └────────────┘ └────────────┘                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Theme 主题模块                        │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │   │
│  │  │ theme      │ │ hlTheme    │ │ macStyle   │            │   │
│  │  │ Registry   │ │ Registry   │ │ Registry   │            │   │
│  │  └────────────┘ └────────────┘ └────────────┘            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Platform 平台适配模块                   │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │   │
│  │  │  Medium    │ │  Zhihu     │ │  Toutiao   │            │   │
│  │  └────────────┘ └────────────┘ └────────────┘            │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                        适配器层 (Adapter Layer)                   │
│  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│  │      nodeHttpAdapter         │  │    browserHttpAdapter    │ │
│  │      (Node 环境 HTTP)         │  │    (浏览器环境 HTTP)      │ │
│  └──────────────────────────────┘  └──────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                        基础设施层 (Infrastructure)                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │   marked   │ │ highlight.js│ │  mathjax   │ │  css-tree  │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │ front-matter│ │  jsdom     │ │ formdata   │                  │
│  └────────────┘ └────────────┘ └────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
src/
├── core/                    # 核心层 - 平台无关的渲染逻辑
│   ├── parser/              # 解析器模块
│   │   ├── markedParser.ts  # Markdown 解析
│   │   ├── mathjaxParser.ts # 数学公式解析
│   │   ├── cssParser.ts     # CSS 解析与修改
│   │   └── frontMatterParser.ts # YAML 头信息解析
│   ├── renderer/            # 渲染器模块
│   │   ├── themeApplyRender.ts    # 主题应用
│   │   ├── highlightApplyRender.ts # 代码高亮应用
│   │   ├── macStyleRender.ts      # Mac 风格渲染
│   │   ├── wechatPostRender.ts    # 微信后处理
│   │   ├── footnotesRender.ts     # 脚注渲染
│   │   └── pseudoApplyRender.ts   # 伪元素应用
│   ├── theme/               # 主题注册与管理
│   │   ├── themeRegistry.ts       # 文章主题注册
│   │   ├── hlThemeRegistry.ts     # 高亮主题注册
│   │   └── macStyleRegistry.ts    # Mac 风格注册
│   ├── platform/            # 平台适配
│   │   ├── medium.ts        # Medium 平台
│   │   ├── zhihu.ts         # 知乎平台
│   │   └── toutiao.ts       # 头条平台
│   ├── index.ts             # 核心入口
│   └── utils.ts             # 工具函数
├── node/                    # Node 环境专用模块
│   ├── publish.ts           # 微信发布逻辑
│   ├── wrapper.ts           # 兼容层封装
│   ├── render.ts            # Node 环境渲染
│   ├── tokenStore.ts        # 微信 Token 缓存
│   ├── uploadCacheStore.ts  # 图片上传缓存
│   ├── configStore.ts       # 配置存储
│   ├── clientPublish.ts     # 客户端发布
│   ├── nodeHttpAdapter.ts   # Node HTTP 适配器
│   └── utils.ts             # Node 工具函数
├── browser/                 # 浏览器环境专用模块
│   └── browserHttpAdapter.ts # 浏览器 HTTP 适配器
├── assets/                  # 静态资源
│   ├── themes/              # 文章主题 CSS
│   ├── highlight/styles/    # 代码高亮主题 CSS
│   └── mac_style.css        # Mac 风格样式
├── wechat.ts                # 微信客户端 API
└── http.ts                  # HTTP 适配器接口
```

### 2.3 架构特点

#### 2.3.1 平台无关性设计

项目通过**适配器模式**实现了核心逻辑的平台无关性：

```typescript
// http.ts - 定义统一接口
export interface HttpAdapter {
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
    createMultipart(field: string, file: Blob, filename: string): MultipartBody;
}

// node/nodeHttpAdapter.ts - Node 实现
export const nodeHttpAdapter: HttpAdapter = {
    fetch,
    createMultipart(field, file, filename) {
        const form = new FormData();
        form.append(field, file, filename);
        const encoder = new FormDataEncoder(form);
        return { body: Readable.from(encoder), headers: encoder.headers, duplex: "half" };
    },
};

// browser/browserHttpAdapter.ts - 浏览器实现
export const browserHttpAdapter: HttpAdapter = {
    fetch: window.fetch.bind(window),
    createMultipart(field, file, filename) {
        const form = new FormData();
        form.append(field, file, filename);
        return { body: form };
    },
};
```

#### 2.3.2 工厂模式与单例模式

- **工厂模式**：`createWenyanCore()`、`createMarkedClient()`、`createMathJaxParser()` 等
- **单例模式**：`tokenStore`、`uploadCacheStore`、主题注册表等

```typescript
// 工厂模式示例
export async function createWenyanCore(options: WenyanOptions = {}) {
    const markedClient = createMarkedClient();
    const mathJaxParser = createMathJaxParser();
    // ...
    return {
        async renderMarkdown(markdown: string): Promise<string> { ... },
        async applyStylesWithTheme(...): Promise<string> { ... },
    };
}

// 单例模式示例
class TokenStore {
    private cache: TokenCache = { ...defaultCache };
    // ...
}
export const tokenStore = new TokenStore();
```

#### 2.3.3 注册表模式

主题管理采用注册表模式，支持动态注册和扩展：

```typescript
const registry = new Map<string, Theme>();

export function registerTheme(theme: Theme) {
    registry.set(theme.meta.id, theme);
}

export function getTheme(id: string): Theme | undefined {
    return registry.get(id);
}
```

---

## 三、功能模块划分

### 3.1 解析器模块 (Parser)

| 模块 | 文件 | 功能 | 核心依赖 |
|------|------|------|----------|
| Markdown 解析器 | markedParser.ts | 将 Markdown 转换为 HTML | marked, marked-highlight, highlight.js |
| MathJax 解析器 | mathjaxParser.ts | 将 LaTeX 公式转换为 SVG | mathjax-full |
| CSS 解析器 | cssParser.ts | 解析、修改、应用 CSS | css-tree |
| Front Matter 解析器 | frontMatterParser.ts | 解析 YAML 头信息 | front-matter |

#### 3.1.1 Markdown 解析器特点

- **扩展语法支持**：自定义图片属性语法 `![](){...}`
- **代码高亮集成**：通过 `marked-highlight` 扩展实现
- **自定义渲染器**：重写标题、段落、图片渲染逻辑

```typescript
// 自定义图片属性语法扩展
md.use({
    extensions: [{
        name: "attributeImage",
        level: "inline",
        tokenizer(src) {
            const rule = /^!\[([^\]]*)\]\(([^)]+)\)\{([^}]+)\}/;
            const match = rule.exec(src);
            if (match) {
                return {
                    type: "attributeImage",
                    raw: match[0],
                    text: match[1],    // alt 文本
                    href: match[2],    // 图片链接
                    attrs: match[3],   // 属性字符串
                    tokens: [],
                };
            }
            return undefined;
        },
        renderer(token) {
            const attrs = stringToMap(token.attrs);
            const styleStr = Array.from(attrs)
                .map(([k, v]) => (/^\d+$/.test(v) ? `${k}:${v}px` : `${k}:${v}`))
                .join("; ");
            return `<img src="${token.href}" alt="${token.text || ""}" style="${styleStr}">`;
        },
    }],
});
```

#### 3.1.2 MathJax 解析器特点

- **完整 TeX 支持**：加载所有 TeX 包
- **SVG 输出**：输出为 SVG 格式，兼容微信公众号
- **容器包装**：行内公式用 `<span>`，块级公式用 `<section>`

```typescript
function addContainer(math: MathItem, doc: MathDocument) {
    const tag = math.display ? "section" : "span";
    const cls = math.display ? "block-equation" : "inline-equation";
    const container = math.typesetRoot;
    if (math.math) {
        doc.adaptor.setAttribute(container, "math", math.math);
    }
    const node = doc.adaptor.node(tag, { class: cls }, [container]);
    math.typesetRoot = node;
}
```

### 3.2 渲染器模块 (Renderer)

| 模块 | 文件 | 功能 |
|------|------|------|
| 主题应用渲染器 | themeApplyRender.ts | 将主题 CSS 应用到 DOM 元素 |
| 高亮应用渲染器 | highlightApplyRender.ts | 将代码高亮 CSS 应用到代码块 |
| Mac 风格渲染器 | macStyleRender.ts | 应用 macOS 风格样式 |
| 微信后处理器 | wechatPostRender.ts | 微信公众号兼容性处理 |
| 脚注渲染器 | footnotesRender.ts | 自动生成引用脚注 |
| 伪元素应用器 | pseudoApplyRender.ts | 将 CSS 伪元素转换为真实 DOM |

#### 3.2.1 CSS 应用机制

项目创新性地将 CSS 样式直接内联到 DOM 元素：

```typescript
export function createCssApplier(css: string) {
    const ast = csstree.parse(css, parseOptions);
    return function applyToElement(element: HTMLElement): void {
        csstree.walk(ast, {
            visit: "Rule",
            enter(node) {
                // 遍历选择器和声明
                // 将样式直接设置到元素的 style 属性
                el.style.setProperty(property, value, priority);
            },
        });
    };
}
```

#### 3.2.2 伪元素处理

由于微信公众号不支持 `::before` 和 `::after` 伪元素，项目将其转换为真实 DOM：

```typescript
export function applyPseudoElements(element: HTMLElement, themeCss: string): void {
    const ast = csstree.parse(themeCss, parseOptions);
    const rules = extractPseudoRules(ast);
    
    rules.forEach((rule, tag) => {
        const elements = element.querySelectorAll<HTMLElement>(tag);
        elements.forEach((el) => {
            if (rule.before.size > 0) {
                el.insertBefore(buildPseudoElement(rule.before, doc), el.firstChild);
            }
            if (rule.after.size > 0) {
                el.appendChild(buildPseudoElement(rule.after, doc));
            }
        });
    });
}
```

### 3.3 主题模块 (Theme)

| 模块 | 功能 | 内置数量 |
|------|------|----------|
| 文章主题注册表 | 管理文章排版主题 | 8 个公众号主题 + 4 个平台主题 |
| 高亮主题注册表 | 管理代码高亮主题 | 9 个主题 |
| Mac 风格注册表 | 管理 macOS 风格样式 | 1 个 |

#### 内置文章主题

| ID | 名称 | 作者 |
|----|------|------|
| default | Default | - |
| orangeheart | Orange Heart | evgo2017 |
| rainbow | Rainbow | thezbm |
| lapis | Lapis | YiNN |
| pie | Pie | kevinzhao2233 |
| maize | Maize | BEATREE |
| purple | Purple | hliu202 |
| phycat | 物理猫-薄荷 | sumruler |

#### 内置代码高亮主题

atom-one-dark, atom-one-light, dracula, github-dark, github, monokai, solarized-dark, solarized-light, xcode

### 3.4 平台适配模块 (Platform)

| 平台 | 文件 | 特殊处理 |
|------|------|----------|
| Medium | medium.ts | 表格转 ASCII、代码块扁平化、公式还原为 TeX |
| 知乎 | zhihu.ts | 公式转为带 data-eeimg 的 img 标签 |
| 头条 | toutiao.ts | 公式转为 data URI 的 SVG 图片 |

### 3.5 Node 环境模块

| 模块 | 功能 |
|------|------|
| publish.ts | 微信公众号草稿发布 |
| wrapper.ts | 兼容旧版本的 API 封装 |
| render.ts | Node 环境下的渲染入口 |
| tokenStore.ts | 微信 access_token 缓存管理 |
| uploadCacheStore.ts | 图片上传结果缓存（基于 MD5） |
| configStore.ts | 用户配置存储 |
| clientPublish.ts | 客户端发布到远程服务器 |

---

## 四、数据流程分析

### 4.1 核心渲染流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Markdown 输入                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. handleFrontMatter() - 解析 YAML 头信息                           │
│     - 提取 title, description, cover, author, source_url            │
│     - 返回 body (去除头信息的 Markdown)                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. renderMarkdown() - Markdown → HTML                               │
│     ├── marked.parse() - 基础 Markdown 解析                          │
│     ├── marked-highlight - 代码高亮                                   │
│     ├── 自定义图片属性语法处理                                          │
│     └── mathjaxParser.parser() - 公式转 SVG (可选)                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. 创建 DOM 容器                                                     │
│     const dom = new JSDOM(`<body><section id="wenyan">${html}</section></body>`) │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. applyStylesWithTheme() - 应用样式                                 │
│     ├── addFootnotes() - 添加脚注引用                                  │
│     ├── renderMacStyle() - 应用 Mac 风格                              │
│     ├── renderTheme() - 应用文章主题 CSS                               │
│     ├── applyPseudoElements() - 转换伪元素为真实 DOM                   │
│     ├── renderHighlightTheme() - 应用代码高亮 CSS                     │
│     └── wechatPostRender() - 微信兼容性后处理                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         HTML 输出                                     │
│              (可直接粘贴到微信公众号编辑器)                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 微信发布流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Markdown 文件 + 配置                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. prepareRenderContext() - 准备渲染上下文                           │
│     - 读取文件内容                                                    │
│     - 解析相对路径                                                    │
│     - 调用核心渲染流程                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. getAccessTokenWithCache() - 获取访问令牌                          │
│     - 检查本地缓存是否有效                                             │
│     - 无效则调用微信 API 获取新令牌                                     │
│     - 缓存令牌（提前 10 分钟过期）                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. uploadImages() - 上传正文图片                                     │
│     ├── 解析 HTML 中的 <img> 标签                                     │
│     ├── 检查是否已上传（MD5 缓存）                                      │
│     ├── 未上传则调用 uploadMaterial()                                  │
│     └── 替换 src 为微信图片 URL                                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. 上传封面图                                                        │
│     - 使用指定的封面图或正文第一张图                                     │
│     - 获取 thumb_media_id                                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. publishArticle() - 发布到草稿箱                                   │
│     - 调用微信草稿箱 API                                               │
│     - 返回 media_id                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 CSS 变量处理流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                      原始主题 CSS                                     │
│              (包含 CSS 变量定义 :root { --var: value })               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  replaceCSSVariables() - CSS 变量替换                                 │
│     ├── 提取变量定义到字典                                             │
│     ├── 递归解析嵌套的 var() 引用                                      │
│     ├── 替换所有 var() 为实际值                                        │
│     └── 移除 :root 块                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   处理后的 CSS (无变量)                                │
│              (可直接内联到 DOM 元素)                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 五、技术选型分析

### 5.1 核心依赖

| 依赖 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| marked | ^15.0.12 | Markdown 解析 | 高性能、可扩展、生态成熟 |
| marked-highlight | ^2.2.1 | 代码高亮扩展 | 与 marked 无缝集成 |
| highlight.js | 11.10.0 | 语法高亮 | 支持语言多、主题丰富 |
| mathjax-full | 3.2.2 | 数学公式渲染 | 完整 TeX 支持、SVG 输出 |
| css-tree | ^3.1.0 | CSS 解析 | 标准 CSS AST、支持伪元素 |
| front-matter | ^4.0.2 | YAML 头解析 | 轻量、简单易用 |

### 5.2 开发依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| typescript | ^5.9.2 | 类型安全 |
| vite | ^7.1.4 | 构建工具 |
| vitest | ^3.2.4 | 测试框架 |
| jsdom | ^27.4.0 | DOM 模拟 (peer) |
| formdata-node | ^6.0.3 | FormData 实现 (peer) |

### 5.3 构建配置

项目使用 **Vite + TypeScript** 构建，输出为 ESM 模块：

```typescript
// vite.config.ts
export default defineConfig({
    build: {
        lib: {
            entry: {
                core: "src/core/index.ts",
                publish: "src/node/publish.ts",
                wrapper: "src/node/wrapper.ts",
                wechat: "src/wechat.ts",
            },
            formats: ["es"],
        },
        ssr: true,
        rollupOptions: {
            external: [/* 外部化所有依赖 */],
        },
    },
});
```

### 5.4 包导出设计

```json
{
    "exports": {
        ".": { "import": "./dist/core.js", "types": "./dist/types/core/index.d.ts" },
        "./publish": { "import": "./dist/publish.js", "types": "./dist/types/node/publish.d.ts" },
        "./wrapper": { "import": "./dist/wrapper.js", "types": "./dist/types/node/wrapper.d.ts" },
        "./wechat": { "import": "./dist/wechat.js", "types": "./dist/types/wechat.d.ts" },
        "./http": { "types": "./dist/types/http.d.ts" }
    }
}
```

---

## 六、开发思路与设计理念

### 6.1 核心设计理念

#### 6.1.1 平台无关优先

项目从设计之初就考虑了多平台支持：

- **核心层完全平台无关**：不依赖 Node.js 特有 API
- **适配器模式隔离平台差异**：HTTP、文件系统等通过适配器抽象
- **条件依赖**：jsdom、formdata-node 作为 peer dependencies

#### 6.1.2 样式内联策略

微信公众号编辑器不支持外部样式表和 `<style>` 标签，项目采用**样式内联**策略：

1. 解析 CSS 为 AST
2. 遍历选择器匹配 DOM 元素
3. 将样式直接设置到元素的 `style` 属性

#### 6.1.3 渐进增强

- **基础功能**：Markdown → HTML
- **可选增强**：MathJax 转换、微信后处理
- **扩展能力**：自定义主题、自定义高亮

### 6.2 模块化设计

#### 6.2.1 单一职责

每个模块职责清晰：

- Parser 只负责解析
- Renderer 只负责渲染
- Registry 只负责注册和查找

#### 6.2.2 依赖注入

通过工厂函数注入依赖：

```typescript
export function createWenyanCore(options: WenyanOptions = {}) {
    const markedClient = createMarkedClient();
    const mathJaxParser = createMathJaxParser();
    // ...
}
```

### 6.3 可扩展性设计

#### 6.3.1 主题扩展

```typescript
// 注册自定义主题
registerTheme({
    meta: { id: "custom", name: "Custom", ... },
    getCss: () => loadCssBySource({ type: "url", url: "..." }),
});
```

#### 6.3.2 平台扩展

```typescript
// 添加新平台适配
export function getContentForNewPlatform(wenyanElement: HTMLElement): string {
    // 平台特定的处理逻辑
    return wenyanElement.outerHTML;
}
```

---

## 七、改进与优化建议

### 7.1 性能优化

#### 7.1.1 CSS 解析缓存

**问题**：每次渲染都会重新解析 CSS，造成性能浪费。

**建议**：

```typescript
// 添加 CSS 解析缓存
const cssAstCache = new Map<string, csstree.CssNode>();

function parseCssWithCache(css: string): csstree.CssNode {
    const hash = createHash('md5').update(css).digest('hex');
    if (!cssAstCache.has(hash)) {
        cssAstCache.set(hash, csstree.parse(css, parseOptions));
    }
    return cssAstCache.get(hash)!;
}
```

**必要性**：减少重复解析开销，提升批量渲染性能。

#### 7.1.2 并行处理优化

**问题**：图片上传是串行的，大文档处理较慢。

**建议**：

```typescript
// 已有并行上传，但可以添加并发控制
async function uploadImagesWithConcurrency(
    images: HTMLImageElement[],
    accessToken: string,
    concurrency: number = 5
): Promise<void> {
    const queue = new PQueue({ concurrency });
    await queue.addAll(images.map(img => () => uploadImage(img, accessToken)));
}
```

**必要性**：避免过多并发请求被限流，同时提升整体上传速度。

### 7.2 功能扩展

#### 7.2.1 支持更多 Markdown 扩展语法

**建议**：

- 支持任务列表 ` - [ ] task`
- 支持定义列表
- 支持脚注语法 `[^1]`
- 支持 Mermaid 图表

**实施方向**：通过 marked 扩展机制添加自定义 tokenizer 和 renderer。

#### 7.2.2 图片处理增强

**建议**：

```typescript
interface ImageProcessOptions {
    maxWidth?: number;      // 最大宽度
    quality?: number;       // 压缩质量
    format?: 'webp' | 'jpeg' | 'png'; // 转换格式
    watermark?: string;     // 水印
}

async function processImage(image: Buffer, options: ImageProcessOptions): Promise<Buffer> {
    // 使用 sharp 库处理图片
}
```

**必要性**：优化图片大小，提升加载速度，节省微信素材库空间。

#### 7.2.3 版本对比功能

**建议**：添加文章版本对比功能，方便查看修改历史。

### 7.3 代码质量提升

#### 7.3.1 错误处理增强

**问题**：部分错误信息不够详细，调试困难。

**建议**：

```typescript
// 自定义错误类
class WenyanError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'WenyanError';
    }
}

// 使用示例
throw new WenyanError(
    '主题不存在',
    'THEME_NOT_FOUND',
    { themeId, availableThemes: getAllThemes().map(t => t.meta.id) }
);
```

**必要性**：提供更清晰的错误信息，便于问题定位和用户反馈。

#### 7.3.2 类型定义完善

**建议**：

```typescript
// 添加更严格的类型约束
export interface StrictThemeMeta extends ThemeMeta {
    id: Brand<string, 'ThemeId'>;  // 品牌类型
}

// 使用 const assertions
const DEFAULT_OPTIONS = {
    isConvertMathJax: true,
    isWechat: true,
} as const;
```

#### 7.3.3 单元测试覆盖

**建议**：

- 增加边界条件测试
- 添加集成测试
- 使用快照测试验证渲染结果

### 7.4 安全性增强

#### 7.4.1 XSS 防护

**问题**：Markdown 渲染可能引入 XSS 风险。

**建议**：

```typescript
import DOMPurify from 'dompurify';

function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [...],
        ALLOWED_ATTR: [...],
    });
}
```

**必要性**：防止恶意脚本注入，保护用户数据安全。

#### 7.4.2 敏感信息保护

**建议**：

```typescript
// 环境变量加密存储
import { safeStorage } from 'safe-storage';

class SecureTokenStore {
    async setToken(appid: string, token: string): Promise<void> {
        const encrypted = safeStorage.encryptString(token);
        // 存储加密后的 token
    }
}
```

**必要性**：保护微信 API 凭据，防止泄露。

### 7.5 用户体验改进

#### 7.5.1 进度反馈

**建议**：

```typescript
interface ProgressCallback {
    (stage: string, progress: number, message: string): void;
}

async function publishWithProgress(
    options: PublishOptions,
    onProgress: ProgressCallback
): Promise<string> {
    onProgress('render', 0, '正在渲染...');
    // ...
    onProgress('upload', 50, '正在上传图片...');
    // ...
    onProgress('publish', 100, '发布完成');
}
```

**必要性**：让用户了解处理进度，提升使用体验。

#### 7.5.2 预览功能

**建议**：添加实时预览接口，支持在编辑器中实时查看渲染效果。

```typescript
interface PreviewOptions {
    debounce?: number;  // 防抖延迟
    partial?: boolean;  // 部分渲染
}

function createPreviewRenderer(options: PreviewOptions): (markdown: string) => Promise<string>;
```

### 7.6 架构优化

#### 7.6.1 插件系统

**建议**：

```typescript
interface WenyanPlugin {
    name: string;
    install(core: WenyanCoreInstance, options?: any): void;
}

// 使用示例
const mermaidPlugin: WenyanPlugin = {
    name: 'mermaid',
    install(core, options) {
        core.addExtension(mermaidExtension);
    }
};

const wenyan = await createWenyanCore();
wenyan.use(mermaidPlugin);
```

**必要性**：提供扩展机制，支持社区贡献。

#### 7.6.2 配置中心化

**建议**：

```typescript
interface WenyanConfig {
    defaultTheme: string;
    defaultHlTheme: string;
    cacheDir: string;
    maxConcurrentUploads: number;
    // ...
}

function configure(config: Partial<WenyanConfig>): void;
```

**必要性**：统一配置管理，简化 API 使用。

---

## 八、总结

### 8.1 项目优势

1. **架构清晰**：分层设计，模块职责明确
2. **平台无关**：核心逻辑可在 Node.js 和浏览器环境运行
3. **扩展性强**：支持自定义主题、高亮、平台适配
4. **功能完整**：覆盖 Markdown 渲染到微信发布的完整流程
5. **类型安全**：TypeScript 编写，类型定义完善

### 8.2 待改进方向

1. **性能优化**：CSS 解析缓存、并发控制
2. **功能扩展**：更多 Markdown 语法、图片处理
3. **代码质量**：错误处理、测试覆盖
4. **安全性**：XSS 防护、敏感信息加密
5. **用户体验**：进度反馈、实时预览

### 8.3 技术亮点

1. **CSS 内联方案**：创新性地将 CSS 样式内联到 DOM，解决微信公众号样式限制
2. **伪元素转换**：将 `::before`/`::after` 转换为真实 DOM，保证样式完整性
3. **多平台适配**：一套渲染逻辑，多平台输出
4. **缓存机制**：Token 缓存、图片上传缓存，减少 API 调用

---

## 附录

### A. 关键接口定义

```typescript
// 核心实例接口
interface WenyanCoreInstance {
    handleFrontMatter(markdown: string): Promise<FrontMatterResult>;
    renderMarkdown(markdown: string): Promise<string>;
    applyStylesWithTheme(wenyanElement: HTMLElement, options?: ApplyStylesOptions): Promise<string>;
    applyStylesWithResolvedCss(wenyanElement: HTMLElement, options: {...}): Promise<string>;
}

// HTTP 适配器接口
interface HttpAdapter {
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
    createMultipart(field: string, file: Blob, filename: string): MultipartBody;
}

// 主题接口
interface Theme {
    meta: ThemeMeta;
    getCss(): Promise<string>;
}
```

### B. 参考资源

- [项目仓库](https://github.com/caol64/wenyan-core)
- [API 文档](docs/api.md)
- [Node 环境渲染文档](docs/node.md)
- [微信发布文档](docs/wechat.md)
