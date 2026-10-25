import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { instrumentBraced, findFunctions, pickEntry } from './instr.js'

const exec = promisify(execFile)

const DECL_RE =
  /\b(?:int|long|short|double|float|char|bool|auto|size_t|string|std::string|vector\s*<[^>]*>[\s>]*|std::vector\s*<[^>]*>[\s>]*|TreeNode|ListNode|Node)\s*[&*]*\s*([A-Za-z_]\w*)/g

let cachedCompiler = null

/** 找 g++：先看 PATH，再看 winget / msys2 常见的安装位置 */
export async function findCompiler() {
  if (cachedCompiler) return cachedCompiler

  const candidates = [process.env.GPP_PATH, 'g++', 'clang++'].filter(Boolean)
  const winPaths = []

  const localAppData = process.env.LOCALAPPDATA || ''
  if (localAppData) {
    const pkgRoot = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages')
    try {
      const dirs = await fs.readdir(pkgRoot)
      for (const d of dirs) {
        if (!/winlibs|mingw|msys/i.test(d)) continue
        for (const sub of ['mingw64/bin/g++.exe', 'bin/g++.exe', 'mingw32/bin/g++.exe']) {
          winPaths.push(path.join(pkgRoot, d, sub))
        }
      }
    } catch {
      /* 目录不存在就算了 */
    }
  }
  winPaths.push(
    'C:\\msys64\\mingw64\\bin\\g++.exe',
    'C:\\mingw64\\bin\\g++.exe',
    'C:\\MinGW\\bin\\g++.exe',
    'D:\\msys64\\mingw64\\bin\\g++.exe'
  )

  for (const c of [...candidates, ...winPaths]) {
    try {
      const { stdout } = await exec(c, ['--version'], { timeout: 8000 })
      const version = (stdout.split('\n')[0] || '').trim()
      cachedCompiler = { bin: c, version }
      return cachedCompiler
    } catch {
      /* 下一个 */
    }
  }
  return null
}

const NODE_STRUCTS = {
  ListNode: `struct ListNode {
    int val;
    ListNode* next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode* n) : val(x), next(n) {}
};`,
  TreeNode: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode* l, TreeNode* r) : val(x), left(l), right(r) {}
};`
}

/** 建树/建链表的模板函数，只在实际用到的类型上实例化 */
const BUILD_HELPERS = `
template <typename T>
static T* __buildList(const std::vector<std::optional<int>>& vals) {
    T* head = nullptr;
    T* tail = nullptr;
    for (const auto& v : vals) {
        if (!v) break;
        T* node = __tr::__mk<T>(*v);
        if (!head) head = node; else tail->next = node;
        tail = node;
    }
    return head;
}

template <typename T>
static T* __buildTree(const std::vector<std::optional<int>>& vals) {
    if (vals.empty() || !vals[0]) return nullptr;
    T* root = __tr::__mk<T>(*vals[0]);
    std::deque<T*> q;
    q.push_back(root);
    size_t i = 1;
    while (!q.empty() && i < vals.size()) {
        T* cur = q.front();
        q.pop_front();
        if (i < vals.size()) {
            if (vals[i]) { T* l = __tr::__mk<T>(*vals[i]); cur->left = l; q.push_back(l); }
            i++;
        }
        if (i < vals.size()) {
            if (vals[i]) { T* r = __tr::__mk<T>(*vals[i]); cur->right = r; q.push_back(r); }
            i++;
        }
    }
    return root;
}
`

function cppString(s) {
  return (
    '"' +
    String(s)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t') +
    '"'
  )
}

/** 从 "TreeNode* root" / "struct ListNode *head" 里取出类型名 */
function typeOf(param) {
  const p = param.replace(/^\s*(struct|class)\s+/, '')
  const m = p.match(/^([A-Za-z_][\w:<>]*)\s*[\*&]*\s*[A-Za-z_]\w*\s*(?:\[\s*\])?/)
  return m ? m[1] : ''
}

function isTreeNode(param) {
  if (isListNode(param)) return false
  if (/TreeNode\s*\*/.test(param)) return true
  // C 风格 struct Node*：类型名分不出树还是链表，靠参数名（root=树）
  const name = param.trim().split(/\s+/).pop() || ''
  return /\bNode\s*\*/.test(param) && /^(root|tree)$/i.test(name)
}

function isListNode(param) {
  if (/ListNode\s*\*/.test(param)) return true
  const name = param.trim().split(/\s+/).pop() || ''
  // C 风格 struct Node* head：靠参数名（head=链表）
  return /\bNode\s*\*/.test(param) && /^(head|list|l1|l2|node)$/i.test(name)
}

/** 把参数映射成 main 里可用的表达式 */
function argExpr(param, idx, extras = {}) {
  const p = param.replace(/\s+/g, ' ')
  const low = p.toLowerCase()

  // 输入里显式给了参数（k=2），按名字优先
  const nameMatch = p.match(/([A-Za-z_]\w*)\s*$/)
  if (nameMatch && Object.prototype.hasOwnProperty.call(extras, nameMatch[1].toLowerCase())) {
    return `extras[${JSON.stringify(nameMatch[1].toLowerCase())}]`
  }

  if (isListNode(p)) return 'head'
  if (isTreeNode(p)) return 'root'
  // char* 参数不能用 c_str() 的 const char*（C 风格签名不带 const）
  if (/char\s*\*/.test(low)) return 'const_cast<char*>(textData.c_str())'
  if (/char\s+\w+\s*\[\s*\]/.test(low)) return 'textData.data()'
  if (/std::string|(^|[^a-z])string([^a-z]|$)/.test(low)) return 'textData'
  if (/vector\s*<\s*(std::)?vector/.test(low)) return 'gridData'
  if (/vector\s*</.test(low)) return 'arrVec'
  if (/\[\s*\]|\*/.test(p)) return 'arrData'

  // 拿参数名本身做精确匹配（不含类型）：单字母 l / r 是双指针的左右边界
  const bare = (nameMatch ? nameMatch[1] : '').toLowerCase()
  if (/^(l|i|lo|low|left|start|begin|from|first|a|p)$/.test(bare)) return '0'
  if (/^(r|j|hi|high|right|end|last|to|b|q)$/.test(bare)) return 'n - 1'
  if (/^(mid|middle|m)$/.test(bare)) return 'n / 2'

  if (/target|key|val|value|need|search/.test(low)) return 'target'
  if (/^(l|lo|low|left|start|begin|i)$/.test(bare)) return '0'
  if (/^(r|hi|high|right|end|last|j)$/.test(bare)) return 'n - 1'
  return 'n'
}

function buildMain(fns, entry, data, extras) {
  const fn = fns.find((f) => f.name === entry)
  const params = fn ? fn.params : []
  const { nums, grid, text, usingVector } = data

  const len = nums ? nums.length : text != null ? text.length : grid ? grid.length : 0
  const needsTree = params.some(isTreeNode)
  const needsList = params.some(isListNode)
  const treeType = typeOf(params.find(isTreeNode) || 'TreeNode* root').replace(/^struct\s+/, '')
  const listType = typeOf(params.find(isListNode) || 'ListNode* head').replace(/^struct\s+/, '')

  const lines = []
  const numsLit = `{${(nums || []).map((v) => (v === null || v === undefined ? 'std::nullopt' : v)).join(', ')}}`
  lines.push(`  std::vector<std::optional<int>> numsData = ${numsLit};`)
  lines.push(`  std::vector<int> arrVec = {${(nums || []).map((v) => (v === null || v === undefined ? 0 : v)).join(', ')}};`)
  lines.push(`  int arrData[${Math.max(1, (nums || []).length)}] = {${(nums || []).map((v) => (v === null || v === undefined ? 0 : v)).join(', ') || '0'}};`)
  if (grid) {
    lines.push(`  std::vector<std::vector<int>> gridData = {${grid.map((r) => `{${r.join(', ')}}`).join(', ')}};`)
  } else {
    lines.push(`  std::vector<std::vector<int>> gridData;`)
  }
  lines.push(`  std::string textData = ${cppString(text || '')};`)
  lines.push('  std::map<std::string, int> extras;')
  for (const [k, v] of Object.entries(extras || {})) {
    lines.push(`  extras[${JSON.stringify(String(k).toLowerCase())}] = ${Number(v)};`)
  }
  lines.push(`  int n = ${len};`)
  const targetExpr = nums && nums.length ? String(nums[Math.floor(nums.length / 2)] ?? 0) : text ? `(int)textData[${Math.floor(len / 2)}]` : '0'
  lines.push(`  int target = ${targetExpr};`)
  if (needsTree) lines.push(`  ${treeType}* root = __buildTree<${treeType}>(numsData);`)
  if (needsList) lines.push(`  ${listType}* head = __buildList<${listType}>(numsData);`)

  const args = params.map((p, i) => argExpr(p, i, extras))
  const callArgs = args.join(', ')
  // 返回指针（原地排序后 return arr 的写法）没法直接序列化，按长度展开成数组；
  // 其余交给 callRet（模板里判断 void）
  const ret = (fn && fn.ret ? fn.ret : '').replace(/\b(const|constexpr|inline)\b/g, '').trim()
  // 只有「数值指针」才按数组展开；ListNode*/TreeNode* 交给 __val（它能顺着 next/left 走），
  // char* 交给 __val 当字符串，硬展开会把节点内存当数组读，直接段错误
  const returnsPtr = /^(int|long|short|double|float|bool|size_t|unsigned|signed)\s*\*$/.test(ret)
  if (returnsPtr) {
    lines.push(`  auto __ret = ${entry}(${callArgs});`)
    lines.push(`  std::cout << "@@RET@@" << __tr::__arr(__ret, n) << "\\n";`)
  } else {
    lines.push(`  __tr::callRet(${entry}${args.length ? ', ' + callArgs : ''});`)
  }

  return `\nint main() {\n${lines.join('\n')}\n  return 0;\n}\n`
}

export async function runCpp({ code, input, inputKind, extras, entry, dir, lang }) {
  const compiler = await findCompiler()
  if (!compiler) {
    return {
      ok: false,
      error:
        '没找到 C/C++ 编译器。Windows 上装一个就能用：\n' +
        '  winget install BrechtSanders.WinLibs.POSIX.UCRT\n' +
        '装完重启 runner 即可（或设置环境变量 GPP_PATH 指向 g++.exe）。'
    }
  }

  const fns = findFunctions(code, 'cpp')
  const entryName = pickEntry(fns.filter((f) => f.name !== 'main'), entry)
  if (!entryName) {
    return { ok: false, error: '没能识别出函数。请写一个普通函数，比如 void bubbleSort(int arr[], int n) { ... }' }
  }

  const kind = inputKind || 'array'
  const nums = kind === 'array' ? (Array.isArray(input) ? input : []) : null
  const grid = kind === 'matrix' ? (Array.isArray(input) ? input : []) : null
  const text = kind === 'string' ? String(input ?? '') : null
  const usingVector = /vector\s*</.test(code)

  // 输入形态和参数类型对不上时提前报错（C++ 里空数组会静默跑完，很难查）
  {
    const fn = fns.find((f) => f.name === entryName)
    const params = fn ? fn.params : []
    const isArrParam = (p) => /\[\s*\]|\*/.test(p) && !/char\s*\*|TreeNode|ListNode|Node\b/.test(p)
    const isMatParam = (p) => /vector\s*<\s*(std::)?vector/.test(p)
    if (kind === 'string' && params.some((p) => isArrParam(p) || isMatParam(p))) {
      return {
        ok: false,
        error: '这个函数的参数是数组，但输入被当成了字符串。\n请填用英文逗号分隔的数字，比如 1,0,2'
      }
    }
    if (kind !== 'matrix' && params.some(isMatParam)) {
      return { ok: false, error: '这个函数要二维数组（vector<vector<int>>），输入请写成 [[1,2],[3,4]] 或 1,2; 3,4' }
    }
  }

  // 用户没定义节点结构就自动补上（LeetCode 环境自带，本地没有）
  const extraDecls = []
  for (const name of ['ListNode', 'TreeNode']) {
    const used = new RegExp(`\\b${name}\\b`).test(code)
    const defined = new RegExp(`(struct|class)\\s+${name}\\b`).test(code)
    if (used && !defined) extraDecls.push(NODE_STRUCTS[name])
  }

  // 参数里的数组（int arr[] / int* arr）在函数内是指针，必须靠长度变量展开；
  // 但链表/树指针不能用 __A 展开
  const arrayNames = new Set()
  for (const m of code.matchAll(/[A-Za-z_]\w*\s*\**\s*([A-Za-z_]\w*)\s*\[\s*\]/g)) {
    arrayNames.add(m[1])
  }
  for (const m of code.matchAll(/[A-Za-z_]\w*\s*\*\s*([A-Za-z_]\w*)\s*(?:,\s*[A-Za-z_]\w*\s+[A-Za-z_]\w*)?\s*\)/g)) {
    arrayNames.add(m[1])
  }
  const nodeNames = new Set()
  for (const fn of fns) {
    for (const p of fn.params) {
      if (isTreeNode(p) || isListNode(p)) {
        const m = p.match(/([A-Za-z_]\w*)\s*$/)
        if (m) nodeNames.add(m[1])
      }
    }
  }
  for (const n of nodeNames) arrayNames.delete(n)

  const instrumented = instrumentBraced(code, {
    declRe: DECL_RE,
    call: (line, vars) => {
      if (!vars.length) return '' // 空参数列表在 C++ 全局作用域会被当成函数声明
      const items = vars.map((v) => {
        if (arrayNames.has(v)) {
          const lenVar = ['n', 'len', 'size', 'count', 'length'].find((x) => vars.includes(x))
          if (lenVar) return `__A(${v}, ${lenVar})`
        }
        return `__V(${v})`
      })
      return `__T(${line}, ${items.join(', ')});`
    }
  })

  const headerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'trace.hpp')
  const hasMain = /int\s+main\s*\(/.test(code)

  const source = `#include "trace.hpp"
#include <optional>
#include <vector>
#include <map>
#include <algorithm>
#include <climits>
#include <cmath>
using namespace std;
${extraDecls.length ? extraDecls.join('\n\n') + '\n\n' : ''}${BUILD_HELPERS}
${instrumented}
${hasMain ? '' : buildMain(fns, entryName, { nums, grid, text, usingVector }, extras)}`

  if (process.env.DEBUG_CPP) console.log('=== SOURCE ===\n' + source)
  const srcPath = path.join(dir, 'main.cpp')
  await fs.writeFile(srcPath, source, 'utf8')

  // 把 trace.hpp 拷到临时目录，避免相对路径问题
  await fs.copyFile(headerPath, path.join(dir, 'trace.hpp'))

  const exePath = path.join(dir, 'main.exe')
  try {
    await exec(compiler.bin, ['-std=c++17', '-O0', '-w', '-static', '-static-libgcc', '-static-libstdc++', 'main.cpp', '-o', 'main.exe'], {
      cwd: dir,
      timeout: 25000,
      maxBuffer: 4 * 1024 * 1024
    })
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || '').toString()
    return { ok: false, error: '编译失败：\n' + msg.slice(0, 1500) }
  }

  let stdout = ''
  try {
    const r = await exec(exePath, [], { cwd: dir, timeout: 5000, maxBuffer: 8 * 1024 * 1024 })
    stdout = r.stdout
    if (process.env.DEBUG_CPP) console.log('RUN stdout len=', stdout.length, 'stderr=', JSON.stringify((r.stderr || '').slice(0, 200)))
  } catch (e) {
    if (e.killed || e.signal) {
      return { ok: false, error: '运行超过 5 秒被终止，检查是不是有循环没有退出条件。' }
    }
    stdout = e.stdout || ''
    if (!stdout) {
      const code = e.code
      return {
        ok: false,
        error: '运行出错（退出码 ' + code + '）：' + ((e.stderr || '').trim() || '程序没有输出就退出了，可能是段错误或栈溢出').slice(0, 800)
      }
    }
  }

  const steps = []
  const userOut = []
  let ret = null
  for (const line of stdout.split('\n')) {
    if (line.startsWith('@@T@@')) {
      try {
        steps.push(JSON.parse(line.slice(5)))
      } catch {
        /* 跳过坏行 */
      }
    } else if (line.startsWith('@@RET@@')) {
      try {
        ret = JSON.parse(line.slice(7))
      } catch {
        ret = line.slice(7)
      }
    } else if (line.trim()) {
      userOut.push(line)
    }
  }

  return {
    ok: true,
    steps,
    entry: entryName,
    lang,
    result: ret,
    stdout: userOut.join('\n').slice(0, 2000),
    truncated: steps.length >= 4000
  }
}
