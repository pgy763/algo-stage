// KMP 字符串匹配：先建失配数组（fail），再用它让主串指针永不回退。
// 两段式：① 对模式串自匹配建 fail；② 主串匹配，失配时 j = fail[j]。

const PATTERN = 'ABABC'
const TEXT = 'ABABABCABABC'

export default {
  id: 'kmp',
  name: 'KMP 字符串匹配',
  en: 'KMP',
  category: '双指针与滑窗',
  level: '困难',
  view: 'array',
  complexity: { time: 'O(n+m)', space: 'O(m)' },
  summary: '失配时主串指针绝不回退 —— 模式串自己滑到该在的位置，靠的是先认识自己。',
  inputType: 'none',
  code: [
    '// ① 建 fail：fail[i] = P[0..i] 的最长相等前后缀长度',
    'let len = 0;',
    'for (let i = 1; i < m; i++) {',
    '  while (len > 0 && P[i] !== P[len]) len = fail[len - 1];',
    '  if (P[i] === P[len]) fail[i] = ++len;',
    '}',
    '',
    '// ② 匹配：j 指向模式串已匹配的下一个位置',
    'let j = 0;',
    'for (let i = 0; i < n; i++) {',
    '  while (j > 0 && T[i] !== P[j]) j = fail[j - 1];',
    '  if (T[i] === P[j]) j++;',
    '  if (j === m) return i - m + 1;  // 完整命中',
    '}'
  ],

  run() {
    const P = [...PATTERN]
    const T = [...TEXT]
    const m = P.length
    const n = T.length
    const fail = Array(m).fill(0)
    const steps = []

    const snap = (o) => steps.push({ view: 'array', compare: [], swap: [], sorted: [], ...o })

    // ---------- ① 建 fail ----------
    let len = 0
    snap({
      array: [...P],
      pointers: [{ name: 'len', index: 0 }],
      aux: [],
      line: 0,
      desc: `第一段：模式串 ${PATTERN} 给自己做个「自我介绍」—— 对每个位置求「最长相等前后缀」。这是 KMP 的全部秘密。`
    })

    for (let i = 1; i < m; i++) {
      while (len > 0 && P[i] !== P[len]) {
        snap({
          array: [...P],
          pointers: [
            { name: 'i', index: i },
            { name: 'len', index: len }
          ],
          aux: [...fail],
          compare: [i, len],
          line: 3,
          desc: `P[${i}]='${P[i]}' ≠ P[${len}]='${P[len]}'，前缀匹配中断。别从头来 —— len 跳到 fail[${len - 1}]=${fail[len - 1]}，继续试。`
        })
        len = fail[len - 1]
      }
      if (P[i] === P[len]) {
        len++
        fail[i] = len
        snap({
          array: [...P],
          pointers: [
            { name: 'i', index: i },
            { name: 'len', index: len - 1 }
          ],
          aux: [...fail],
          sorted: [i],
          line: 4,
          desc: `P[${i}]='${P[i]}' = P[${len - 1}]='${P[i === len - 1 ? i : len - 1]}'，前后缀延长一格：fail[${i}] = ${fail[i]}。`
        })
      } else {
        fail[i] = 0
        snap({
          array: [...P],
          pointers: [{ name: 'i', index: i }],
          aux: [...fail],
          sorted: [i],
          line: 4,
          desc: `没有公共前后缀，fail[${i}] = 0。`
        })
      }
    }

    snap({
      array: [...P],
      aux: [...fail],
      line: 5,
      desc: `fail 表齐了：[${fail.join(', ')}]。含义：匹配到 P[${3}]='B' 失败时，模式串该滑到哪里 —— 答案藏在表里，不用回头。`
    })

    // ---------- ② 主串匹配 ----------
    let j = 0
    let matched = -1

    snap({
      array: [...T],
      pointers: [
        { name: 'i', index: 0 },
        { name: 'j', index: 0 }
      ],
      line: 8,
      desc: `第二段：在主串 ${TEXT} 里找 ${PATTERN}。i 指主串、j 指模式串，i 永远只前进、绝不回退。`
    })

    for (let i = 0; i < n; i++) {
      while (j > 0 && T[i] !== P[j]) {
        const from = j
        j = fail[j - 1]
        snap({
          array: [...T],
          pointers: [{ name: 'i', index: i }],
          swap: [i],
          range: j > 0 ? { from: i - j, to: i } : undefined,
          line: 10,
          desc: `失配：T[${i}]='${T[i]}' ≠ P[${j}]='${P[j]}'。j 从 ${from} 跳到 fail[${from - 1}]=${j} —— 模式串「自己往左缩」，主串 i 纹丝不动。这就是 KMP 省掉的全部回退。`
        })
      }

      if (T[i] === P[j]) {
        j++
        const start = i - j + 1
        snap({
          array: [...T],
          pointers: [{ name: 'i', index: i }],
          sorted: Array.from({ length: j }, (_, x) => start + x),
          range: { from: start, to: i },
          line: 11,
          desc: `T[${i}]='${T[i]}' = P[${j - 1}]='${P[j - 1]}'，j 推进到 ${j}（已匹配 ${j} 个字符）。`
        })

        if (j === m) {
          const start = i - m + 1
          if (matched === -1) matched = start
          snap({
            array: [...T],
            sorted: Array.from({ length: m }, (_, x) => start + x),
            range: { from: start, to: start + m - 1 },
            line: 12,
            desc: `完整命中！起始下标 ${start}。全程 i 没有回退过一次 —— 失配时模式串自己滑，主串指针原地不动。`
          })
          j = fail[j - 1] // 继续找下一个匹配
        }
      }
    }

    snap({
      array: [...T],
      line: 12,
      desc: `结束：主串只扫了一遍（${n} 格），模式串靠 fail 表滑动。暴力法最坏 O(n×m)，KMP 是 O(n+m)。`
    })

    return { steps, result: matched }
  }
}
