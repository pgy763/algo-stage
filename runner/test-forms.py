"""多形态用例：链表 / 树 / 字符串 / 矩阵，四种语言各来一遍。"""
import json
import urllib.request

BASE = "http://localhost:5199/api/run"


def run(lang, code, input_data, kind, entry=None):
    body = json.dumps(
        {"lang": lang, "code": code, "input": input_data, "inputKind": kind, "entry": entry}
    ).encode()
    req = urllib.request.Request(BASE, data=body, headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=90))


def show(label, r, want_steps=True):
    steps = r.get("steps") or []
    flag = "OK " if (r.get("ok") and (steps or not want_steps)) else "ERR"
    print(f"{flag} {label:<26} steps={len(steps):<4} result={str(r.get('result'))[:40]}")
    if not r.get("ok"):
        print("     ", str(r.get("error"))[:300].replace("\n", " / "))
    return r


# ---------------- 链表：反转链表 ----------------
list_codes = {
    "java": ("class Solution {\n"
             "    public ListNode reverseList(ListNode head) {\n"
             "        ListNode prev = null;\n"
             "        ListNode cur = head;\n"
             "        while (cur != null) {\n"
             "            ListNode nxt = cur.next;\n"
             "            cur.next = prev;\n"
             "            prev = cur;\n"
             "            cur = nxt;\n"
             "        }\n"
             "        return prev;\n"
             "    }\n"
             "}"),
    "python": (
        "def reverseList(head):\n"
        "    prev = None\n"
        "    cur = head\n"
        "    while cur:\n"
        "        nxt = cur.next\n"
        "        cur.next = prev\n"
        "        prev = cur\n"
        "        cur = nxt\n"
        "    return prev\n"
    ),
    "cpp": (
        "ListNode* reverseList(ListNode* head) {\n"
        "    ListNode* prev = nullptr;\n"
        "    ListNode* cur = head;\n"
        "    while (cur != nullptr) {\n"
        "        ListNode* nxt = cur->next;\n"
        "        cur->next = prev;\n"
        "        prev = cur;\n"
        "        cur = nxt;\n"
        "    }\n"
        "    return prev;\n"
        "}"
    ),
}

for lang, code in list_codes.items():
    r = show(f"{lang} 反转链表", run(lang, code, [1, 2, 3, 4, 5], "array"))
    if r.get("steps"):
        print("      首帧:", json.dumps(r["steps"][0]["vars"], ensure_ascii=False)[:120])
        print("      末帧:", json.dumps(r["steps"][-1]["vars"], ensure_ascii=False)[:120])

# ---------------- 树：最大深度 ----------------
tree_codes = {
    "python": (
        "def maxDepth(root):\n"
        "    if not root:\n"
        "        return 0\n"
        "    left = maxDepth(root.left)\n"
        "    right = maxDepth(root.right)\n"
        "    return 1 + max(left, right)\n"
    ),
    "cpp": (
        "int maxDepth(TreeNode* root) {\n"
        "    if (root == nullptr) {\n"
        "        return 0;\n"
        "    }\n"
        "    int left = maxDepth(root->left);\n"
        "    int right = maxDepth(root->right);\n"
        "    return 1 + max(left, right);\n"
        "}"
    ),
    "java": (
        "class Solution {\n"
        "    public int maxDepth(TreeNode root) {\n"
        "        if (root == null) {\n"
        "            return 0;\n"
        "        }\n"
        "        int left = maxDepth(root.left);\n"
        "        int right = maxDepth(root.right);\n"
        "        return 1 + Math.max(left, right);\n"
        "    }\n"
        "}"
    ),
}
for lang, code in tree_codes.items():
    r = show(f"{lang} 树最大深度", run(lang, code, [3, 9, 20, None, None, 15, 7], "array"))
    if r.get("steps"):
        print("      末帧:", json.dumps(r["steps"][-1]["vars"], ensure_ascii=False)[:160])

# ---------------- 字符串：最长无重复子串 ----------------
str_codes = {
    "python": (
        "def lengthOfLongestSubstring(s):\n"
        "    seen = {}\n"
        "    best = 0\n"
        "    left = 0\n"
        "    for right, ch in enumerate(s):\n"
        "        if ch in seen and seen[ch] >= left:\n"
        "            left = seen[ch] + 1\n"
        "        seen[ch] = right\n"
        "        best = max(best, right - left + 1)\n"
        "    return best\n"
    ),
    "java": (
        "class Solution {\n"
        "    public int lengthOfLongestSubstring(String s) {\n"
        "        int[] last = new int[128];\n"
        "        for (int i = 0; i < 128; i++) last[i] = -1;\n"
        "        int best = 0;\n"
        "        int left = 0;\n"
        "        for (int right = 0; right < s.length(); right++) {\n"
        "            char ch = s.charAt(right);\n"
        "            if (last[ch] >= left) {\n"
        "                left = last[ch] + 1;\n"
        "            }\n"
        "            last[ch] = right;\n"
        "            best = Math.max(best, right - left + 1);\n"
        "        }\n"
        "        return best;\n"
        "    }\n"
        "}"
    ),
    "cpp": (
        "int lengthOfLongestSubstring(std::string s) {\n"
        "    int last[128];\n"
        "    for (int i = 0; i < 128; i++) last[i] = -1;\n"
        "    int best = 0;\n"
        "    int left = 0;\n"
        "    for (int right = 0; right < (int)s.size(); right++) {\n"
        "        char ch = s[right];\n"
        "        if (last[ch] >= left) {\n"
        "            left = last[ch] + 1;\n"
        "        }\n"
        "        last[ch] = right;\n"
        "        best = std::max(best, right - left + 1);\n"
        "    }\n"
        "    return best;\n"
        "}"
    ),
}
for lang, code in str_codes.items():
    r = show(f"{lang} 最长无重复子串", run(lang, code, "abcabcbb", "string"))
    if r.get("steps"):
        print("      末帧:", json.dumps(r["steps"][-1]["vars"], ensure_ascii=False)[:140])

# ---------------- 矩阵：不同路径 ----------------
matrix_codes = {
    "python": (
        "def uniquePaths(grid):\n"
        "    rows = len(grid)\n"
        "    cols = len(grid[0])\n"
        "    dp = [[0] * cols for _ in range(rows)]\n"
        "    for i in range(rows):\n"
        "        dp[i][0] = 1\n"
        "    for j in range(cols):\n"
        "        dp[0][j] = 1\n"
        "    for i in range(1, rows):\n"
        "        for j in range(1, cols):\n"
        "            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]\n"
        "    return dp[rows - 1][cols - 1]\n"
    ),
    "java": (
        "class Solution {\n"
        "    public int uniquePaths(int[][] grid) {\n"
        "        int rows = grid.length;\n"
        "        int cols = grid[0].length;\n"
        "        int[][] dp = new int[rows][cols];\n"
        "        for (int i = 0; i < rows; i++) dp[i][0] = 1;\n"
        "        for (int j = 0; j < cols; j++) dp[0][j] = 1;\n"
        "        for (int i = 1; i < rows; i++) {\n"
        "            for (int j = 1; j < cols; j++) {\n"
        "                dp[i][j] = dp[i - 1][j] + dp[i][j - 1];\n"
        "            }\n"
        "        }\n"
        "        return dp[rows - 1][cols - 1];\n"
        "    }\n"
        "}"
    ),
    "cpp": (
        "int uniquePaths(std::vector<std::vector<int>>& grid) {\n"
        "    int rows = grid.size();\n"
        "    int cols = grid[0].size();\n"
        "    std::vector<std::vector<int>> dp(rows, std::vector<int>(cols, 0));\n"
        "    for (int i = 0; i < rows; i++) dp[i][0] = 1;\n"
        "    for (int j = 0; j < cols; j++) dp[0][j] = 1;\n"
        "    for (int i = 1; i < rows; i++) {\n"
        "        for (int j = 1; j < cols; j++) {\n"
        "            dp[i][j] = dp[i - 1][j] + dp[i][j - 1];\n"
        "        }\n"
        "    }\n"
        "    return dp[rows - 1][cols - 1];\n"
        "}"
    ),
}
grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
for lang, code in matrix_codes.items():
    r = show(f"{lang} 矩阵不同路径", run(lang, code, grid, "matrix"))
    if r.get("steps"):
        print("      末帧:", json.dumps(r["steps"][-1]["vars"], ensure_ascii=False)[:150])
