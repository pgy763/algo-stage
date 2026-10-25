/** 各语言的示例代码。key 和 langs 里的 id 对应 */
export const SAMPLES = {
  javascript: [
    {
      id: 'bubble',
      name: '冒泡排序 · 数组',
      code: `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        const tmp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = tmp;
      }
    }
  }
  return arr;
}`
    },
    {
      id: 'quick',
      name: '快速排序 · 数组',
      code: `function quickSort(arr) {
  sort(arr, 0, arr.length - 1);
  return arr;
}

function sort(arr, lo, hi) {
  if (lo >= hi) return;
  const pivot = arr[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) {
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
      i++;
    }
  }
  const tmp = arr[i];
  arr[i] = arr[hi];
  arr[hi] = tmp;
  sort(arr, lo, i - 1);
  sort(arr, i + 1, hi);
}`
    },
    {
      id: 'binary',
      name: '二分查找 · 数组',
      code: `function binarySearch(arr, target) {
  arr.sort((a, b) => a - b);
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = left + ((right - left) >> 1);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return -1;
}`
    },
    {
      id: 'reverse-list',
      name: '反转链表 · 链表',
      input: '1, 2, 3, 4, 5',
      code: `function reverseList(head) {
  let prev = null;
  let cur = head;
  while (cur) {
    const next = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
  return prev;
}`
    },
    {
      id: 'longest-sub',
      name: '最长无重复子串 · 字符串',
      input: 'abcabcbb',
      code: `function lengthOfLongestSubstring(s) {
  const last = new Map();
  let best = 0;
  let left = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (last.has(ch) && last.get(ch) >= left) {
      left = last.get(ch) + 1;
    }
    last.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}`
    },
    {
      id: 'tree-depth',
      name: '二叉树最大深度 · 树',
      input: '3, 9, 20, null, null, 15, 7',
      code: `function maxDepth(root) {
  if (!root) return 0;
  const left = maxDepth(root.left);
  const right = maxDepth(root.right);
  return 1 + Math.max(left, right);
}`
    }
  ],

  python: [
    {
      id: 'bubble',
      name: '冒泡排序 · 数组',
      code: `def bubbleSort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`
    },
    {
      id: 'quick',
      name: '快速排序 · 数组',
      code: `def quickSort(arr):
    sort(arr, 0, len(arr) - 1)
    return arr


def sort(arr, lo, hi):
    if lo >= hi:
        return
    pivot = arr[hi]
    i = lo
    for j in range(lo, hi):
        if arr[j] < pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[hi] = arr[hi], arr[i]
    sort(arr, lo, i - 1)
    sort(arr, i + 1, hi)`
    },
    {
      id: 'binary',
      name: '二分查找 · 数组',
      code: `def binarySearch(arr, target):
    arr.sort()
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`
    },
    {
      id: 'reverse-list',
      name: '反转链表 · 链表',
      input: '1, 2, 3, 4, 5',
      code: `def reverseList(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return prev`
    },
    {
      id: 'longest-sub',
      name: '最长无重复子串 · 字符串',
      input: 'abcabcbb',
      code: `def lengthOfLongestSubstring(s):
    seen = {}
    best = 0
    left = 0
    for right, ch in enumerate(s):
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1
        seen[ch] = right
        best = max(best, right - left + 1)
    return best`
    },
    {
      id: 'matrix-paths',
      name: '矩阵不同路径 · 二维数组',
      input: '[[0,0,0],[0,0,0],[0,0,0]]',
      code: `def uniquePaths(grid):
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
    return dp[rows - 1][cols - 1]`
    },
    {
      id: 'tree-depth',
      name: '二叉树最大深度 · 树',
      input: '3, 9, 20, null, null, 15, 7',
      code: `def maxDepth(root):
    if not root:
        return 0
    left = maxDepth(root.left)
    right = maxDepth(root.right)
    return 1 + max(left, right)`
    }
  ],

  cpp: [
    {
      id: 'bubble',
      name: '冒泡排序 · 数组',
      code: `void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int t = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
            }
        }
    }
}`
    },
    {
      id: 'selection',
      name: '选择排序 · 数组',
      code: `void selectionSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        if (minIdx != i) {
            int t = arr[i];
            arr[i] = arr[minIdx];
            arr[minIdx] = t;
        }
    }
}`
    },
    {
      id: 'binary',
      name: '二分查找 · 数组',
      code: `int binarySearch(int arr[], int n, int target) {
    int left = 0;
    int right = n - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) {
            return mid;
        }
        if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}`
    },
    {
      id: 'reverse-list',
      name: '反转链表 · 链表',
      input: '1, 2, 3, 4, 5',
      code: `ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* cur = head;
    while (cur != nullptr) {
        ListNode* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}`
    },
    {
      id: 'longest-sub',
      name: '最长无重复子串 · 字符串',
      input: 'abcabcbb',
      code: `int lengthOfLongestSubstring(std::string s) {
    int last[128];
    for (int i = 0; i < 128; i++) last[i] = -1;
    int best = 0;
    int left = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        char ch = s[right];
        if (last[ch] >= left) {
            left = last[ch] + 1;
        }
        last[ch] = right;
        best = std::max(best, right - left + 1);
    }
    return best;
}`
    },
    {
      id: 'matrix-paths',
      name: '矩阵不同路径 · 二维数组',
      input: '[[0,0,0],[0,0,0],[0,0,0]]',
      code: `int uniquePaths(std::vector<std::vector<int>>& grid) {
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
}`
    },
    {
      id: 'tree-depth',
      name: '二叉树最大深度 · 树',
      input: '3, 9, 20, null, null, 15, 7',
      code: `int maxDepth(TreeNode* root) {
    if (root == nullptr) {
        return 0;
    }
    int left = maxDepth(root->left);
    int right = maxDepth(root->right);
    return 1 + max(left, right);
}`
    }
  ],

  c: [
    {
      id: 'bubble',
      name: '冒泡排序 · 数组',
      code: `void bubbleSort(int arr[], int n) {
    int i, j, t;
    for (i = 0; i < n - 1; i++) {
        for (j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                t = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
            }
        }
    }
}`
    },
    {
      id: 'insertion',
      name: '插入排序 · 数组',
      code: `void insertionSort(int arr[], int n) {
    int i, j, key;
    for (i = 1; i < n; i++) {
        key = arr[i];
        j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}`
    },
    {
      id: 'binary',
      name: '二分查找 · 数组',
      code: `int binarySearch(int arr[], int n, int target) {
    int left = 0;
    int right = n - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`
    }
  ],

  java: [
    {
      id: 'bubble',
      name: '冒泡排序 · 数组',
      code: `class Solution {
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
}`
    },
    {
      id: 'quick',
      name: '快速排序 · 数组',
      code: `class Solution {
    static int[] quickSort(int[] arr) {
        sort(arr, 0, arr.length - 1);
        return arr;
    }

    static void sort(int[] arr, int lo, int hi) {
        if (lo >= hi) {
            return;
        }
        int pivot = arr[hi];
        int i = lo;
        for (int j = lo; j < hi; j++) {
            if (arr[j] < pivot) {
                int t = arr[i];
                arr[i] = arr[j];
                arr[j] = t;
                i++;
            }
        }
        int tmp = arr[i];
        arr[i] = arr[hi];
        arr[hi] = tmp;
        sort(arr, lo, i - 1);
        sort(arr, i + 1, hi);
    }
}`
    },
    {
      id: 'binary',
      name: '二分查找 · 数组',
      code: `class Solution {
    static int binarySearch(int[] arr, int target) {
        int left = 0;
        int right = arr.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (arr[mid] == target) {
                return mid;
            }
            if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1;
    }
}`
    },
    {
      id: 'reverse-list',
      name: '反转链表 · 链表',
      input: '1, 2, 3, 4, 5',
      code: `class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode cur = head;
        while (cur != null) {
            ListNode nxt = cur.next;
            cur.next = prev;
            prev = cur;
            cur = nxt;
        }
        return prev;
    }
}`
    },
    {
      id: 'longest-sub',
      name: '最长无重复子串 · 字符串',
      input: 'abcabcbb',
      code: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        int[] last = new int[128];
        for (int i = 0; i < 128; i++) last[i] = -1;
        int best = 0;
        int left = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            if (last[ch] >= left) {
                left = last[ch] + 1;
            }
            last[ch] = right;
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}`
    },
    {
      id: 'matrix-paths',
      name: '矩阵不同路径 · 二维数组',
      input: '[[0,0,0],[0,0,0],[0,0,0]]',
      code: `class Solution {
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
}`
    },
    {
      id: 'tree124',
      name: '二叉树最大路径和 · 树',
      input: '1, 2, 3',
      code: `class Solution {
    int maxSum = Integer.MIN_VALUE;

    public int maxPathSum(TreeNode root) {
        maxGain(root);
        return maxSum;
    }

    public int maxGain(TreeNode node) {
        if (node == null) {
            return 0;
        }
        int leftGain = Math.max(maxGain(node.left), 0);
        int rightGain = Math.max(maxGain(node.right), 0);
        int priceNewpath = node.val + leftGain + rightGain;
        maxSum = Math.max(maxSum, priceNewpath);
        return node.val + Math.max(leftGain, rightGain);
    }
}`
    },
    {
      id: 'tree-depth',
      name: '二叉树最大深度 · 树',
      input: '3, 9, 20, null, null, 15, 7',
      code: `class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) {
            return 0;
        }
        int left = maxDepth(root.left);
        int right = maxDepth(root.right);
        return 1 + Math.max(left, right);
    }
}`
    }
  ]
}
