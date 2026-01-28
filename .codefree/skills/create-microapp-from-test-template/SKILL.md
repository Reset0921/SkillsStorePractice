# create-microapp-from-test-template

基于 child-test-manage 模板创建新的微应用。

## 使用方式

在对话中说 "从test模板创建微应用" 或 "/create-microapp-from-test-template" 来触发此技能。

## 模板信息

模板使用 `project/child-test-manage`，配置如下：
- 微应用名称: `test`
- 包名称: `child-test-manage`
- 端口号: `6015`
- 中文标题: `测试微应用`

## 参数说明

执行时会询问以下参数：

| 参数 | 说明 | 示例 |
|------|------|------|
| 微应用名称 | 用于路由和 qiankun 注册的标识 | `exam`, `art`, `micro` |
| 包名称 | package.json 中的 name | `child-exam-manage` |
| 端口号 | 开发服务器端口 | `6001`, `5100` |
| 中文标题 | 页面显示的中文名称 | `考试管理` |

## 自动处理的内容

技能会自动：

1. **复制模板目录**：将 child-test-manage 目录复制为新名称（跳过 node_modules, dist 等）
2. **修改配置文件**：
   - `package.json` - 更新 name
   - `vite.config.ts/js` - 更新 port 和 base 路径
   - `presets/index.ts/js` - 更新 qiankun name
   - `index.html` - 更新容器 ID 和标题
   - `src/main.ts/js` - 更新 mount 容器 ID
   - `src/plugins/router.ts/js` - 更新 base 路径
   - `src/style/base.less` - 更新 `#test` 和 `#__qiankun_microapp_wrapper_for_test__` 选择器
3. **注册到主应用**：在主应用 config 中添加微应用注册
4. **更新根 package.json**：添加开发脚本和 workspace

## 后续操作

创建完成后：

1. 运行 `yarn install` 或 `npm install` 安装依赖
2. 运行 `yarn <微应用名>` 启动微应用
3. 访问 `http://localhost:<端口>` 或主应用的 `/<微应用名>` 路由