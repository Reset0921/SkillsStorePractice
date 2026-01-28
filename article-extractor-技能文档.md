---
name: article-extractor
description: 从URL中提取干净的文章内容（博客文章、文章、教程）并保存为可读文本。当用户想要从URL下载、提取或保存文章/博客文章而不需要广告、导航或其他杂乱内容时使用。
allowed-tools: Bash,Write
---

# 文章提取器

此技能从网络文章和博客文章中提取主要内容，移除导航、广告、通讯订阅和其他杂乱内容。保存干净、可读的文本。

## 何时使用此技能

当用户出现以下情况时激活：
- 提供文章/博客URL并想要文本内容
- 要求"下载这篇文章"
- 想要"从[URL]提取内容"
- 要求"将这篇博客文章保存为文本"
- 需要没有干扰的干净文章文本

## 工作原理

### 优先级顺序：
1. **检查工具是否已安装**（reader或trafilatura）
2. **下载并提取文章**使用最佳可用工具
3. **清理内容**（移除多余空格，正确格式化）
4. **保存到文件**以文章标题作为文件名
5. **确认位置**并显示预览

## 安装检查

按以下顺序检查文章提取工具：

### 选项1：reader（推荐 - Mozilla的Readability）

```bash
command -v reader
```

如果未安装：
```bash
npm install -g @mozilla/readability-cli
# 或
npm install -g reader-cli
```

### 选项2：trafilatura（基于Python，非常好）

```bash
command -v trafilatura
```

如果未安装：
```bash
pip3 install trafilatura
```

### 选项3：备用方案（curl + 简单解析）

如果没有可用工具，使用基本的curl + 文本提取（不太可靠但可用）

## 提取方法

### 方法1：使用reader（适用于大多数文章）

```bash
# 提取文章
reader "URL" > article.txt
```

**优点：**
- 基于Mozilla的Readability算法
- 擅长移除杂乱内容
- 保留文章结构

### 方法2：使用trafilatura（适用于博客/新闻）

```bash
# 提取文章
trafilatura --URL "URL" --output-format txt > article.txt

# 或使用更多选项
trafilatura --URL "URL" --output-format txt --no-comments --no-tables > article.txt
```

**优点：**
- 非常准确的提取
- 适用于各种网站结构
- 支持多种语言

**选项：**
- `--no-comments`：跳过评论部分
- `--no-tables`：跳过数据表格
- `--precision`：优先考虑精确度而非召回率
- `--recall`：提取更多内容（可能包含一些噪音）

### 方法3：备用方案（curl + 基本解析）

```bash
# 下载并提取基本内容
curl -s "URL" | python3 -c "
from html.parser import HTMLParser
import sys

class ArticleExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_content = False
        self.content = []
        self.skip_tags = {'script', 'style', 'nav', 'header', 'footer', 'aside'}
        self.current_tag = None

    def handle_starttag(self, tag, attrs):
        if tag not in self.skip_tags:
            if tag in {'p', 'article', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}:
                self.in_content = True
        self.current_tag = tag

    def handle_data(self, data):
        if self.in_content and data.strip():
            self.content.append(data.strip())

    def get_content(self):
        return '\n\n'.join(self.content)

parser = ArticleExtractor()
parser.feed(sys.stdin.read())
print(parser.get_content())
" > article.txt
```

**注意：**这不太可靠，但无需依赖即可工作。

## 获取文章标题

提取标题作为文件名：

### 使用reader：
```bash
# reader输出markdown，标题在顶部
TITLE=$(reader "URL" | head -n 1 | sed 's/^# //')
```

### 使用trafilatura：
```bash
# 获取包括标题在内的元数据
TITLE=$(trafilatura --URL "URL" --json | python3 -c "import json, sys; print(json.load(sys.stdin)['title'])")
```

### 使用curl（备用方案）：
```bash
TITLE=$(curl -s "URL" | grep -oP '<title>\K[^<]+' | sed 's/ - .*//' | sed 's/ | .*//')
```

## 文件名创建

清理标题以适应文件系统：

```bash
# 获取标题
TITLE="Article Title from Website"

# 清理以适应文件系统（移除特殊字符，限制长度）
FILENAME=$(echo "$TITLE" | tr '/' '-' | tr ':' '-' | tr '?' '' | tr '"' '' | tr '<' '' | tr '>' '' | tr '|' '-' | cut -c 1-100 | sed 's/ *$//')

# 添加扩展名
FILENAME="${FILENAME}.txt"
```

## 完整工作流程

```bash
ARTICLE_URL="https://example.com/article"

# 检查工具
if command -v reader &> /dev/null; then
    TOOL="reader"
    echo "使用reader（Mozilla Readability）"
elif command -v trafilatura &> /dev/null; then
    TOOL="trafilatura"
    echo "使用trafilatura"
else
    TOOL="fallback"
    echo "使用备用方法（可能不太准确）"
fi

# 提取文章
case $TOOL in
    reader)
        # 获取内容
        reader "$ARTICLE_URL" > temp_article.txt

        # 获取标题（markdown中#之后的第一行）
        TITLE=$(head -n 1 temp_article.txt | sed 's/^# //')
        ;;

    trafilatura)
        # 从元数据获取标题
        METADATA=$(trafilatura --URL "$ARTICLE_URL" --json)
        TITLE=$(echo "$METADATA" | python3 -c "import json, sys; print(json.load(sys.stdin).get('title', 'Article'))")

        # 获取干净内容
        trafilatura --URL "$ARTICLE_URL" --output-format txt --no-comments > temp_article.txt
        ;;

    fallback)
        # 获取标题
        TITLE=$(curl -s "$ARTICLE_URL" | grep -oP '<title>\K[^<]+' | head -n 1)
        TITLE=${TITLE%% - *}  # 移除网站名称
        TITLE=${TITLE%% | *}  # 移除网站名称（备选）

        # 获取内容（基本提取）
        curl -s "$ARTICLE_URL" | python3 -c "
from html.parser import HTMLParser
import sys

class ArticleExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_content = False
        self.content = []
        self.skip_tags = {'script', 'style', 'nav', 'header', 'footer', 'aside', 'form'}

    def handle_starttag(self, tag, attrs):
        if tag not in self.skip_tags:
            if tag in {'p', 'article', 'main'}:
                self.in_content = True
        if tag in {'h1', 'h2', 'h3'}:
            self.content.append('\n')

    def handle_data(self, data):
        if self.in_content and data.strip():
            self.content.append(data.strip())

    def get_content(self):
        return '\n\n'.join(self.content)

parser = ArticleExtractor()
parser.feed(sys.stdin.read())
print(parser.get_content())
" > temp_article.txt
        ;;
esac

# 清理文件名
FILENAME=$(echo "$TITLE" | tr '/' '-' | tr ':' '-' | tr '?' '' | tr '"' '' | tr '<>' '' | tr '|' '-' | cut -c 1-80 | sed 's/ *$//' | sed 's/^ *//')
FILENAME="${FILENAME}.txt"

# 移动到最终文件名
mv temp_article.txt "$FILENAME"

# 显示结果
echo "✓ 已提取文章：$TITLE"
echo "✓ 已保存到：$FILENAME"
echo ""
echo "预览（前10行）："
head -n 10 "$FILENAME"
```

## 错误处理

### 常见问题

**1. 工具未安装**
- 尝试备用工具（reader → trafilatura → fallback）
- 提供安装建议："使用以下命令安装reader：npm install -g reader-cli"

**2. 需要付费墙或登录**
- 提取工具可能会失败
- 通知用户："此文章需要身份验证。无法提取。"

**3. 无效的URL**
- 检查URL格式
- 尝试使用和不使用重定向

**4. 未提取到内容**
- 网站可能大量使用JavaScript
- 尝试备用方法
- 如果提取失败，通知用户

**5. 标题中的特殊字符**
- 清理标题以适应文件系统
- 移除：`/`、`:`、`?`、`"`、`<`、`>`、`|`
- 替换为`-`或移除

## 输出格式

### 保存的文件包含：
- 文章标题（如果可用）
- 作者（如果工具提供）
- 主要文章文本
- 章节标题
- 没有导航、广告或杂乱内容

### 被移除的内容：
- 导航菜单
- 广告和促销内容
- 通讯订阅表单
- 相关文章侧边栏
- 评论部分（可选）
- 社交媒体按钮
- Cookie通知

## 获得最佳效果的技巧

**1. 对大多数文章使用reader**
- 最好的全能工具
- 基于Firefox阅读器视图
- 适用于大多数新闻网站和博客

**2. 对以下情况使用trafilatura：**
- 学术文章
- 新闻网站
- 布局复杂的博客
- 非英语内容

**3. 备用方法的限制：**
- 可能包含一些噪音
- 段落检测不太准确
- 对于简单网站，总比没有好

**4. 检查提取质量：**
- 始终向用户显示预览
- 询问是否看起来正确
- 如需要，提供尝试不同工具的选项

## 使用示例

**简单提取：**
```bash
# 用户："提取 https://example.com/article"
reader "https://example.com/article" > temp.txt
TITLE=$(head -n 1 temp.txt | sed 's/^# //')
FILENAME="$(echo "$TITLE" | tr '/' '-').txt"
mv temp.txt "$FILENAME"
echo "✓ 已保存到：$FILENAME"
```

**带错误处理：**
```bash
if ! reader "$URL" > temp.txt 2>/dev/null; then
    if command -v trafilatura &> /dev/null; then
        trafilatura --URL "$URL" --output-format txt > temp.txt
    else
        echo "错误：无法提取文章。请安装reader或trafilatura。"
        exit 1
    fi
fi
```

## 最佳实践

- ✅ 提取后始终显示预览（前10行）
- ✅ 保存前验证提取成功
- ✅ 清理文件名以适应文件系统
- ✅ 如果主要方法失败，尝试备用方法
- ✅ 通知用户使用了哪个工具
- ✅ 保持文件名长度合理（< 100字符）

## 提取后

向用户显示：
1. "✓ 已提取：[文章标题]"
2. "✓ 已保存到：[文件名]"
3. 显示预览（前10-15行）
4. 文件大小和位置

询问是否需要：
- "您是否希望我基于此创建一个Ship-Learn-Next计划？"（如果使用ship-learn-next技能）
- "我应该提取另一篇文章吗？"
