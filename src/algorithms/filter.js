/**
 * 首页的「分类 + 关键词」过滤。
 *
 * 单独抽成纯函数，是因为这块有个很容易埋的坑：搜索词得同时匹配中文名、英文名、id、
 * 类别、难度、摘要和复杂度 —— 只搜 name 的话，输入 "dp" 就找不到「最长递增子序列」，
 * 输入 "O(n log n)" 也什么都搜不到。这种"少拼一个字段"的错误肉眼看不出来，只能靠测试钉住。
 */

/** 空格分隔多个关键词，全部命中才算匹配（AND 语义） */
export function matchesQuery(algo, query) {
  const terms = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!terms.length) return true

  const hay = [algo.name, algo.en, algo.id, algo.category, algo.level, algo.summary, algo.complexity?.time]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return terms.every((t) => hay.includes(t))
}

/** 分类 + 关键词一起过滤；category 为「全部」时跳过分类判断 */
export function filterAlgorithms(list, category = '全部', query = '') {
  return list.filter((a) => (category === '全部' || a.category === category) && matchesQuery(a, query))
}