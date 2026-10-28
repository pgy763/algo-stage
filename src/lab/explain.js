/**
 * 把「正在执行的那行代码」翻译成一句人话。
 *
 * 只做**语句层面**的解释：这行是在赋值、判断、循环、累加还是返回。
 * 不懂算法意图（那需要读整个函数甚至读题），但足够让新手知道
 * "现在这一步在干什么"，而不是只看到一串变量变来变去。
 */

function stripComment(line) {
  return line
    .replace(/\/\*.*?\*\//g, '')
    .replace(/\/\/.*$/, '')
    .replace(/#.*$/, '')
    .trim()
}

/** 数组下标里的 ±1 说成"前一项/后一项"，比 ratings[i - 1] 好读 */
function humanExpr(expr) {
  let out = String(expr).trim()
  out = out.replace(/([A-Za-z_]\w*)\[\s*([A-Za-z_]\w*)\s*-\s*1\s*\]/g, '$1 的前一项')
  out = out.replace(/([A-Za-z_]\w*)\[\s*([A-Za-z_]\w*)\s*\+\s*1\s*\]/g, '$1 的后一项')
  out = out.replace(/Math\.max\(([^,()]+),\s*([^()]+)\)/g, '（$1 和 $2 里较大的）')
  out = out.replace(/Math\.min\(([^,()]+),\s*([^()]+)\)/g, '（$1 和 $2 里较小的）')
  out = out.replace(/\bstd::max\b|\bmax\(/g, 'max(')
  out = out.replace(/\.length\b|\.size\(\)/g, ' 的长度')
  out = out.replace(/new\s+int\s*\[([^\]]+)\]/g, '长度 $1 的新数组')
  out = out.replace(/\[\s*\]/g, '')
  out = out.replace(/\s+/g, ' ').trim()
  return out
}

function humanCond(cond) {
  return humanExpr(cond).replace(/\s*&&\s*/g, ' 且 ').replace(/\s*\|\|\s*/g, ' 或 ')
}

/**
 * 只翻译「这一行在做什么」，所以当前变量和语言参数暂时用不上。
 * 留着这两个形参是为了让调用方签名稳定（以后想接算法级解说时从这里往下传）。
 */
export function explainLine(rawLine, _step = {}, _opts = {}) {
  const line = stripComment(rawLine || '')
  if (!line) return ''

  // 去掉结尾的分号 / 左花括号，方便匹配
  const exec = line.replace(/[;{]\s*$/, '').replace(/\{\s*$/, '').trim()
  if (!exec) return ''

  // 返回值
  let m = exec.match(/^return\s*(.*)$/s)
  if (m) {
    const expr = m[1].trim()
    if (!expr) return '返回（函数结束）'
    return `返回 ${humanExpr(expr)}`
  }

  // 条件分支
  m = exec.match(/^(?:\}\s*)?else\s+if\s*\((.*)\)$/s)
  if (m) return `换个条件再判断：${humanCond(m[1])}`
  m = exec.match(/^(?:\}\s*)?if\s*\((.*)\)$/s)
  if (m) return `判断：${humanCond(m[1])}`
  if (/^(?:\}\s*)?else\b/.test(exec)) return '否则（上面的条件不成立），走这个分支'

  // 循环
  m = exec.match(/^for\s*\((.*)\)$/s)
  if (m) {
    const parts = m[1].split(';')
    if (parts.length >= 3) {
      const init = parts[0].replace(/^(int|long|let|var|const|auto)\s+/, '').trim()
      const cond = parts[1].trim()
      const stepExpr = parts[2].trim()
      const dir = /--/.test(stepExpr) ? '倒着' : ''
      return `开始${dir}循环：${humanCond(init)}，只要 ${humanCond(cond)} 就继续`
    }
    return `开始循环：${humanCond(m[1])}`
  }
  m = exec.match(/^while\s*\((.*)\)$/s)
  if (m) return `只要 ${humanCond(m[1])} 就继续循环`
  m = exec.match(/^for\s+(\w+)\s+in\s+(.+)$/s)
  if (m) return `依次遍历 ${humanExpr(m[2])}`

  // 自增 / 自减
  m = exec.match(/^([A-Za-z_]\w*)\s*(\+\+|--)$/)
  if (m) return `${m[1]} ${m[2] === '++' ? '加 1' : '减 1'}`

  // 复合赋值：+= -= *= /=
  m = exec.match(/^(.+?)\s*([+\-*/])=\s*(.+)$/s)
  if (m) {
    const target = m[1].trim()
    const op = { '+': '累加', '-': '减去', '*': '乘上', '/': '除以' }[m[2]]
    return `${target} ${op} ${humanExpr(m[3])}`
  }

  // 普通赋值（含数组元素）
  m = exec.match(/^(.+?)\s*=\s*([^=].*)$/s)
  if (m) {
    const target = m[1].trim()
    const rhs = m[2].trim()
    const isDecl = /^(int|long|double|float|char|bool|boolean|String|auto|let|var|const|size_t)\b/.test(target)
    const cleanTarget = target
      .replace(/^(int|long|double|float|char|bool|boolean|String|auto|let|var|const|size_t)\s*(\[\s*\]\s*)?/, '')
      .replace(/\s*,\s*/g, '、')
    const verb = isDecl ? '新建' : '把'
    const tail = isDecl ? ` = ${humanExpr(rhs)}` : ` 设为 ${humanExpr(rhs)}`
    return `${verb} ${cleanTarget}${tail}`
  }

  // 函数调用
  m = exec.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*\((.*)\)$/s)
  if (m) return `调用 ${m[1]}(${m[2].trim()})`

  return ''
}
