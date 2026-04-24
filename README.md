# PocketLedger / 随心记账本

一个面向大学生的本地优先、开源、桌面端个人账本工具。核心目标不是做复杂理财平台，而是把「这个月生活费还剩多少」「钱主要花到了哪里」这件事做清楚。

## 特性

- Electron + React + Vite 桌面架构
- 本地 JSON 文件持久化，无需注册登录
- 交易 CRUD：支出 / 收入 / 转账
- 默认账户与分类，可继续自定义
- 首页总览、账单筛选、统计分析、设置管理
- JSON / CSV 导出、JSON 导入
- 账户余额校准日志
- 首次打开时的生活费与账户余额初始化引导

## 下载与安装

仓库已经配置好 GitHub Actions 自动构建安装包：

- 推送 `v0.1.0` 这种格式的标签后，会自动生成 GitHub Release
- Release 页面会附带对应平台安装包
- 当前默认构建目标：
  - macOS：`dmg` / `zip`
  - Windows：`nsis` 安装包
  - Linux：`AppImage`

普通用户只需要在 GitHub 仓库的 `Releases` 页面下载对应平台安装包即可。

## 本地开发

推荐使用 Node.js 20 LTS。

```bash
nvm use
npm install
npm run dev
```

## 本地打包

```bash
npm run build
```

只验证桌面包结构但不真正生成安装器：

```bash
npm run build:dir
```

## GitHub 发布流程

1. 将代码推到 GitHub 仓库
2. 确保默认分支能通过 `CI`
3. 创建并推送版本标签，例如：

```bash
git tag v0.1.0
git push origin v0.1.0
```

4. 等待 `Release` 工作流完成
5. 在仓库 `Releases` 页面检查安装包是否上传成功

## 数据存储

- Electron 模式下：数据默认保存在系统 `userData` 目录下的 `pocket-ledger-data.json`
- 浏览器模式下：退化为 `localStorage`

## CI / Release

- `CI`：在 `push` 和 `pull_request` 时执行 `npm ci` + `npm run build:web`
- `Release`：在 `v*` 标签或手动触发时构建桌面安装包并上传到 GitHub

## 后续迭代建议

- 补应用图标与安装包品牌资源
- 增加应用内更新检测
- 增加截图 / GIF 演示
- 引入 SQLite 迁移方案
