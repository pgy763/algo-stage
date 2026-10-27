# 贡献指南

感谢有兴趣给 AlgoStage 添砖加瓦！这个项目最欢迎的贡献就是**新算法** —— 加一个新算法只需要一个文件加一行注册，不需要碰任何框架代码。

## 加一个新算法（最常见）

1. 在 `src/algorithms/` 下新建文件，比如 `topological-sort.js`：

```js
export default {
  id: 'topo-sort',              // URL 里的标识，全小写加连字符
  name: '拓扑排序',              // 首页卡片标题
  en: 'Topological Sort',
  category: '图与搜索',          // 首页分类筛选（已有的分类见 index.js）
  level: '进阶',                 // 入门 / 进阶 / 困难
  view: 'grid',                 // array | grid | tree | matrix
  complexity: { time: 'O(V+E)', space: 'O(V)' },
  summary: '一句话讲清它在干什么（会显示在卡片上）',
  defaultInput: [3, 1, 2],      // 默认输入（inputType: 'none' 时省略）
  inputType: 'array',           // 'array' 显示随机按钮，'none' 隐藏
  code: [                        // 左侧展示的伪代码，一行一个元素
    'const queue = ...;',
    'while (queue.length) { ... }'
  ],

  run(input) {
    const steps = []
    // ... 执行算法，每一步 push 一帧快照
    steps.push({ line: 0, desc: '旁白：这一步在干什么' })
    return { steps, result: 42 }
  }
}
```

2. 在 `src/algorithms/index.js` 里 import 并加进 `algorithms` 数组。
3. `npm run dev` 打开首页，卡片自动出现。

### step 快照的字段

一帧 = 一个普通对象，`line` 和 `desc` 必填，其余按你的 `view` 取用：

| 字段 | 用途 |
| --- | --- |
| `line` | 高亮的代码行号（从 0 开始，对应 `code` 数组下标） |
| `desc` | 底部旁白，中文，讲「这一步为什么」而不是复述代码 |
| `array` / `compare` / `swap` / `sorted` | 数组视图：数据 / 比较（黄）/ 交换（红）/ 完成（绿） |
| `pointers` | 指针标签：`{ name: 'i', index: 2 }` |
| `range` | 区间光带：`{ from, to }`（滑窗、二分区间） |
| `aux` | 辅助数组（栈、缓冲区） |
| `grid` | 网格：0 空 1 墙 2 已访问 3 当前 4 路径 5 候选 6 皇后 7 沼泽 |
| `nodes` / `current` / `visited` | 树视图 |
| `rows` | 链表视图：`{ name, vals }[]` |
| `matrix` / `cell` | 矩阵（DP 表）+ 当前格 `[r, c]` |

### 写 desc 的三条建议

- 讲**为什么**，不是做了什么（❌「i 加了 1」→ ✅「i 越过已处理区，j 可以放心右移」）
- 关键转折点单独给一帧（第一次刷新最大值、第一次冲突、第一次回溯）
- 结尾一定有一帧总结复杂度和直觉

## 其它欢迎的贡献

- **代码实验台的能力扩展**：新的参数类型识别、新的可视化形态（见 `src/lab/`、`runner/`）
- **文档修正 / 翻译**
- **Bug 报告**：贴一段跑不动的代码 + 现象，比描述「坏了」有用十倍

## 提交前

```bash
npm run build     # 能构建
```

内置算法想自查的话，用 Node 直接跑一遍 steps 生成：

```bash
node --input-type=module -e "import('./src/algorithms/index.js').then(m => m.algorithms.forEach(a => console.log(a.id, a.run(a.defaultInput).steps.length)))"
```

每个算法一个独立 commit（`feat: 添加 XX 算法`），方便 review。
