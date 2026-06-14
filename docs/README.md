# PrettyCOM 文档索引

本目录存放产品与测试相关文档，供开发、测试和 agent 协作时查阅。

## 阅读顺序

1. 根目录 [README.md](../README.md)
2. [AGENTS.md](../AGENTS.md)
3. [product/ui-interaction-requirements.md](product/ui-interaction-requirements.md)
4. [dev/themes.md](dev/themes.md)（主题模块架构与踩坑）
5. [testing/feature-coverage-matrix.md](testing/feature-coverage-matrix.md)
6. [testing/virtual-serial-setup.md](testing/virtual-serial-setup.md)

## 子目录说明

| 目录 | 内容 |
| --- | --- |
| [product/](product/) | UI 交互与行为约束 |
| [dev/](dev/) | 主题模块等开发指南与踩坑 |
| [testing/](testing/) | FCM、虚拟串口与 E2E |

## Agent 项目 Skill

| Skill | 路径 | 用途 |
| --- | --- | --- |
| prettycom-themes | [.cursor/skills/prettycom-themes/SKILL.md](../.cursor/skills/prettycom-themes/SKILL.md) | 修改/扩展主题、吉祥物、装饰动画 |

## 相关脚本

- npm run test:fc
- npm run test:ports:install / test:ports:check
- npm run test:ports:repair / test:ports:diagnose
