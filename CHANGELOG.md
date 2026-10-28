# 变更日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号用 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

计划中：有向图视图 + 拓扑排序、单帧导出 PNG、深色模式、runner 的资源限额。

## [1.0.0] - 2026-10-28

第一个正式版本：18 个内置算法 + 5 种语言的代码实验台，纯静态、可离线部署。

### 新增

- **内置算法 18 个**：冒泡、快速、归并、堆排序、二分查找、二叉树中序遍历、
  Trie 前缀树、二叉搜索树、滑动窗口、柱状图最大矩形、KMP、BFS、Dijkstra、
  并查集、N 皇后、最长公共子序列、编辑距离、最长递增子序列
- **代码实验台**：JavaScript 走 Worker + AST 插桩，Python / C / C++ / Java 走本地执行服务，
  真编译真执行，逐行记录变量快照，再自动判断该画成数组 / 矩阵 / 树 / 链表
- **播放器**：播放、暂停、单步、变速（0.5×～4×）、拖进度条跳转、`←` `→` `空格` 快捷键
- **分享到某一帧**：URL 带 `?s=`，打开就是那一步
- **AI 逐行解说**（可选）：接自己的模型；没配 key 就用内置规则解说
- **本地账号与作品**：支持导出 / 导入 JSON，导入按 id 合并

### 安全

- 执行服务默认只监听 `127.0.0.1`，并校验 `Origin` 白名单与 `Host` 头（挡 DNS rebinding）
- 限制同时执行数量（`MAX_CONCURRENT`），超出返回 429
- `/api/env` 的 Java 状态改成真跑 `javac -version` 探测，不再写死

### 工程

- ESLint（flat config）+ Prettier + Vitest：76 个用例，覆盖 18 个算法的步骤协议、
  实验台的形态推断、进度条拖动逻辑
- CI：PR 上跑 lint / test / build，只有 main 才部署到 GitHub Pages
- 无障碍：卡片可键盘聚焦、进度条是真正的 `role="slider"`、尊重 `prefers-reduced-motion`
- 深链、OG / Twitter 分享卡片、favicon、`<noscript>` 提示