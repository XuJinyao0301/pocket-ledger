# Contributing

欢迎为 PocketLedger 提交 issue 和 pull request。

## 开发环境

- Node.js 20 LTS
- npm 10+

## 本地启动

```bash
nvm use
npm ci
npm run dev
```

## 提交前检查

```bash
npm run build:web
```

如果你修改了 Electron 打包相关内容，建议额外执行：

```bash
npm run build:dir
```

## 提交建议

- 小步提交，避免一次性混入 UI、数据层、工作流配置三类改动
- 如果改动了数据结构，请同步更新 `README.md`
- 如果改动了发布流程，请同步检查 `.github/workflows`

## Pull Request

- 说明改动目标
- 说明用户可见影响
- 说明是否影响本地数据兼容性
