#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
矩阵回归：每种语言 × 每种数据结构分类。
跑之前先启动 runner：cd runner && npm start

用法：
    python test-matrix.py            # 全部
    python test-matrix.py java       # 只跑某语言
"""
import json
import sys
import urllib.request

API = 'http://localhost:5199/api/run'

CASES = []


def add(cat, lang, code, inp, kind='array', extras=None, expect=None, note=''):
    CASES.append(
        dict(cat=cat, lang=lang, code=code, input=inp, kind=kind,
             extras=extras or {}, expect=expect, note=note)
    )


# ----------------------------------------------------------------------------
# Java
# ----------------------------------------------------------------------------
JAVA_ARRAY = '''import java.util.*;

class Solution {
    static int[] bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int t = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = t;
                }
            }
        }
        return arr;
    }
}'''

JAVA_STRING = '''class Solution {
    public int lengthOfLongestSubstring(String s) {
        int[] last = new int[128];
        for (int i = 0; i < 128; i++) last[i] = -1;
        int best = 0;
        int left = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            if (last[ch] >= left) left = last[ch] + 1;
            last[ch] = right;
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}'''

JAVA_MATRIX = '''class Solution {
    public int uniquePaths(int[][] grid) {
        int rows = grid.length;
        int cols = grid[0].length;
        int[][] dp = new int[rows][cols];
        for (int i = 0; i < rows; i++) dp[i][0] = 1;
        for (int j = 0; j < cols; j++) dp[0][j] = 1;
        for (int i = 1; i < rows; i++) {
            for (int j = 1; j < cols; j++) {
                dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
            }
        }
        return dp[rows - 1][cols - 1];
    }
}'''

JAVA_TREE = '''class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        int left = maxDepth(root.left);
        int right = maxDepth(root.right);
        return 1 + Math.max(left, right);
    }
}'''

JAVA_LIST = '''class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode cur = head;
        while (cur != null) {
            ListNode next = cur.next;
            cur.next = prev;
            prev = cur;
            cur = next;
        }
        return prev;
    }
}'''

JAVA_SET = '''import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) {
                return new int[]{seen.get(need), i};
            }
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}'''

JAVA_MULTI = '''class Solution {
    public int findKthLargest(int[] nums, int k) {
        int n = nums.length;
        return quickselect(nums, 0, n - 1, n - k);
    }

    int quickselect(int[] nums, int l, int r, int k) {
        if (l == r) return nums[k];
        int x = nums[l], i = l - 1, j = r + 1;
        while (i < j) {
            do i++; while (nums[i] < x);
            do j--; while (nums[j] > x);
            if (i < j) {
                int t = nums[i];
                nums[i] = nums[j];
                nums[j] = t;
            }
        }
        if (k <= j) return quickselect(nums, l, j, k);
        return quickselect(nums, j + 1, r, k);
    }
}'''

add('数组', 'java', JAVA_ARRAY, [5, 3, 8, 1], expect=[1, 3, 5, 8])
add('字符串', 'java', JAVA_STRING, 'abcabcbb', kind='string', expect=3)
add('矩阵', 'java', JAVA_MATRIX, [[0, 0, 0], [0, 0, 0], [0, 0, 0]], kind='matrix', expect=6)
add('二叉树', 'java', JAVA_TREE, [3, 9, 20, None, None, 15, 7], expect=3)
add('链表', 'java', JAVA_LIST, [1, 2, 3, 4, 5], expect={'__list': [5, 4, 3, 2, 1]})
add('集合 Map', 'java', JAVA_SET, [2, 7, 11, 15], extras={'target': 9}, expect=[0, 1])
add('多参数', 'java', JAVA_MULTI, [3, 2, 1, 5, 6, 4], extras={'k': 2}, expect=5)

# ----------------------------------------------------------------------------
# Python
# ----------------------------------------------------------------------------
PY_ARRAY = '''def bubbleSort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
'''

PY_STRING = '''def lengthOfLongestSubstring(s):
    last = {}
    best = 0
    left = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best
'''

PY_MATRIX = '''def uniquePaths(grid):
    rows = len(grid)
    cols = len(grid[0])
    dp = [[0] * cols for _ in range(rows)]
    for i in range(rows):
        dp[i][0] = 1
    for j in range(cols):
        dp[0][j] = 1
    for i in range(1, rows):
        for j in range(1, cols):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]
    return dp[rows - 1][cols - 1]
'''

PY_TREE = '''def maxDepth(root):
    if root is None:
        return 0
    left = maxDepth(root.left)
    right = maxDepth(root.right)
    return 1 + max(left, right)
'''

PY_LIST = '''def reverseList(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return prev
'''

PY_SET = '''def twoSum(nums, target):
    seen = {}
    for i, v in enumerate(nums):
        need = target - v
        if need in seen:
            return [seen[need], i]
        seen[v] = i
    return []
'''

PY_MULTI = '''def findKthLargest(nums, k):
    return sorted(nums)[len(nums) - k]
'''

add('数组', 'python', PY_ARRAY, [5, 3, 8, 1], expect=[1, 3, 5, 8])
add('字符串', 'python', PY_STRING, 'abcabcbb', kind='string', expect=3)
add('矩阵', 'python', PY_MATRIX, [[0, 0, 0], [0, 0, 0], [0, 0, 0]], kind='matrix', expect=6)
add('二叉树', 'python', PY_TREE, [3, 9, 20, None, None, 15, 7], expect=3)
add('链表', 'python', PY_LIST, [1, 2, 3, 4, 5], expect={'__list': [5, 4, 3, 2, 1]})
add('集合 dict', 'python', PY_SET, [2, 7, 11, 15], extras={'target': 9}, expect=[0, 1])
add('多参数', 'python', PY_MULTI, [3, 2, 1, 5, 6, 4], extras={'k': 2}, expect=5)

# ----------------------------------------------------------------------------
# C++
# ----------------------------------------------------------------------------
CPP_ARRAY = '''int* bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int t = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
            }
        }
    }
    return arr;
}'''

CPP_STRING = '''int lengthOfLongestSubstring(std::string s) {
    int last[128];
    for (int i = 0; i < 128; i++) last[i] = -1;
    int best = 0, left = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        char ch = s[right];
        if (last[ch] >= left) left = last[ch] + 1;
        last[ch] = right;
        if (right - left + 1 > best) best = right - left + 1;
    }
    return best;
}'''

CPP_MATRIX = '''int uniquePaths(std::vector<std::vector<int>>& grid) {
    int rows = grid.size();
    int cols = grid[0].size();
    std::vector<std::vector<int>> dp(rows, std::vector<int>(cols, 0));
    for (int i = 0; i < rows; i++) dp[i][0] = 1;
    for (int j = 0; j < cols; j++) dp[0][j] = 1;
    for (int i = 1; i < rows; i++) {
        for (int j = 1; j < cols; j++) {
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    return dp[rows - 1][cols - 1];
}'''

CPP_TREE = '''int maxDepth(TreeNode* root) {
    if (root == nullptr) return 0;
    int left = maxDepth(root->left);
    int right = maxDepth(root->right);
    return 1 + (left > right ? left : right);
}'''

CPP_LIST = '''ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* cur = head;
    while (cur != nullptr) {
        ListNode* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}'''

CPP_SET = '''std::vector<int> twoSum(std::vector<int>& nums, int target) {
    std::map<int, int> seen;
    std::vector<int> out;
    for (int i = 0; i < (int)nums.size(); i++) {
        int need = target - nums[i];
        if (seen.count(need)) {
            out.push_back(seen[need]);
            out.push_back(i);
            return out;
        }
        seen[nums[i]] = i;
    }
    return out;
}'''

CPP_MULTI = '''int findKthLargest(std::vector<int>& nums, int k) {
    std::sort(nums.begin(), nums.end());
    return nums[nums.size() - k];
}'''

add('数组', 'cpp', CPP_ARRAY, [5, 3, 8, 1], expect=[1, 3, 5, 8])
add('字符串', 'cpp', CPP_STRING, 'abcabcbb', kind='string', expect=3)
add('矩阵', 'cpp', CPP_MATRIX, [[0, 0, 0], [0, 0, 0], [0, 0, 0]], kind='matrix', expect=6)
add('二叉树', 'cpp', CPP_TREE, [3, 9, 20, None, None, 15, 7], expect=3)
add('链表', 'cpp', CPP_LIST, [1, 2, 3, 4, 5], expect={'__list': [5, 4, 3, 2, 1]})
add('集合 map', 'cpp', CPP_SET, [2, 7, 11, 15], extras={'target': 9}, expect=[0, 1])
add('多参数', 'cpp', CPP_MULTI, [3, 2, 1, 5, 6, 4], extras={'k': 2}, expect=5)

# ----------------------------------------------------------------------------
# C（用 C 写法，由 g++ 编译；没有 STL 就用数组）
# ----------------------------------------------------------------------------
C_ARRAY = '''void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int t = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
            }
        }
    }
}'''

C_STRING = '''int lengthOfLongestSubstring(char* s) {
    int last[128];
    for (int i = 0; i < 128; i++) last[i] = -1;
    int best = 0, left = 0;
    for (int right = 0; s[right] != '\\0'; right++) {
        char ch = s[right];
        if (last[ch] >= left) left = last[ch] + 1;
        last[ch] = right;
        if (right - left + 1 > best) best = right - left + 1;
    }
    return best;
}'''

C_SET = '''int twoSumCount(int nums[], int n, int target) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (nums[i] + nums[j] == target) count++;
        }
    }
    return count;
}'''

add('数组', 'c', C_ARRAY, [5, 3, 8, 1], expect=None, note='void 原地排序')
add('字符串', 'c', C_STRING, 'abcabcbb', kind='string', expect=3)
add('集合（双重循环替代）', 'c', C_SET, [2, 7, 11, 15], extras={'target': 9}, expect=1)

C_LIST = '''struct Node { int val; struct Node* next; };

struct Node* reverseList(struct Node* head) {
    struct Node* prev = 0;
    struct Node* cur = head;
    while (cur) {
        struct Node* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}'''

C_TREE = '''struct TreeNode { int val; struct TreeNode* left; struct TreeNode* right; };

int maxDepth(struct TreeNode* root) {
    if (!root) return 0;
    int l = maxDepth(root->left);
    int r = maxDepth(root->right);
    return 1 + (l > r ? l : r);
}'''

add('链表', 'c', C_LIST, [1, 2, 3], expect={'__list': [3, 2, 1]})
add('二叉树', 'c', C_TREE, [3, 9, 20, None, None, 15, 7], expect=3)


# ----------------------------------------------------------------------------
def run(case):
    body = json.dumps({
        'lang': case['lang'],
        'code': case['code'],
        'input': case['input'],
        'inputKind': case['kind'],
        'extras': case['extras'],
        'entry': case.get('entry') or None,
    }).encode()
    req = urllib.request.Request(API, data=body, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except Exception as e:  # noqa: BLE001
        return {'ok': False, 'error': '请求失败：' + str(e)}


def main():
    only = sys.argv[1].lower() if len(sys.argv) > 1 else None
    cases = [c for c in CASES if not only or c['lang'] == only]

    print('=' * 92)
    print(f'矩阵回归：{len(cases)} 个用例')
    print('=' * 92)

    fails = []
    for c in cases:
        r = run(c)
        ok = bool(r.get('ok'))
        steps = len(r.get('steps') or [])
        got = r.get('result')
        expect = c['expect']

        good = ok and steps > 0
        if expect is not None:
            good = good and got == expect
        else:
            good = good  # void：只要能跑出帧就算过

        flag = 'OK ' if good else 'ERR'
        if not good:
            fails.append(c)

        print(
            f'{flag} {c["cat"]:<16} {c["lang"]:<7} '
            f'steps={steps:<4} got={json.dumps(got, ensure_ascii=False)[:34]:<36} '
            f'expect={json.dumps(expect, ensure_ascii=False)[:24]}'
        )
        if not ok:
            err = str(r.get('error') or '').replace('\n', ' / ')
            print('     └─ ' + err[:200])

    print('-' * 92)
    print(f'{len(cases) - len(fails)}/{len(cases)} 通过')
    if fails:
        print('\n失败清单：')
        for c in fails:
            print(f'  - [{c["lang"]}] {c["cat"]}')
    return 0 if not fails else 1


if __name__ == '__main__':
    sys.exit(main())
