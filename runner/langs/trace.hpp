#pragma once
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <deque>
#include <utility>
#include <cstddef>
#include <type_traits>

/*
 * C/C++ 追踪头文件。
 * 插桩方式：在每条语句前插入 __T(行号, __V(arr), __V(i), ...)
 * 快照以 "@@T@@{json}" 的形式打到 stdout，父进程按前缀分离。
 *
 * 类型识别全靠模板探针：只要有 .next 就按链表展开，有 .left/.right 就按二叉树展开，
 * 不需要用户改代码、也不需要知道节点的具体类型名。
 */
namespace __tr {

inline void __print(const std::string& s) { std::cout << "@@T@@" << s << "\n"; }

inline std::string __jsonStr(const std::string& s) {
  std::ostringstream o;
  o << '"';
  for (char c : s) {
    if (c == '"' || c == '\\') o << '\\' << c;
    else if (c == '\n') o << "\\n";
    else if (c == '\t') o << "\\t";
    else if (c == '\r') o << "\\r";
    else o << c;
  }
  o << '"';
  return o.str();
}

// ---------- 结构探针 ----------
template <typename T, typename = void>
struct has_next : std::false_type {};
template <typename T>
struct has_next<T, std::void_t<decltype(std::declval<T>().next)>> : std::true_type {};

template <typename T, typename = void>
struct has_children : std::false_type {};
template <typename T>
struct has_children<T, std::void_t<decltype(std::declval<T>().left), decltype(std::declval<T>().right)>>
    : std::true_type {};

template <typename T>
std::string __val(const T& v);

template <typename P>
std::string __nodeVal(const P& node) {
  return __val(node.val);
}

/** 链表：沿 next 走，输出 {"__list":[值...]} */
template <typename P>
std::string __listJson(const P* head) {
  std::ostringstream o;
  o << "{\"__list\":[";
  const P* cur = head;
  int guard = 0;
  while (cur != nullptr && guard < 200) {
    if (guard) o << ",";
    o << __nodeVal(*cur);
    cur = cur->next;
    ++guard;
  }
  o << "]}";
  return o.str();
}

/** 二叉树：层序输出，末尾 null 去掉，前端按 LeetCode 的格式还原 */
template <typename P>
std::string __treeJson(const P* root) {
  std::deque<const P*> q;
  if (root != nullptr) q.push_back(root);
  std::vector<std::string> vals;
  int guard = 0;
  while (!q.empty() && vals.size() < 300 && guard < 4000) {
    ++guard;
    const P* cur = q.front();
    q.pop_front();
    if (cur == nullptr) {
      vals.push_back("null");
      continue;
    }
    vals.push_back(__nodeVal(*cur));
    q.push_back(cur->left);
    q.push_back(cur->right);
  }
  while (!vals.empty() && vals.back() == "null") vals.pop_back();

  std::ostringstream o;
  o << "{\"__tree\":[";
  for (size_t i = 0; i < vals.size(); ++i) {
    if (i) o << ",";
    o << vals[i];
  }
  o << "]}";
  return o.str();
}

// ---------- 值序列化 ----------
inline std::string __val(const std::string& v) { return __jsonStr(v); }
inline std::string __val(const char* v) { return __jsonStr(v ? std::string(v) : std::string("")); }
inline std::string __val(char v) { return __jsonStr(std::string(1, v)); }
inline std::string __val(bool v) { return v ? "true" : "false"; }

template <typename T>
std::string __val(const std::vector<T>& v) {
  std::ostringstream o;
  o << "[";
  for (size_t i = 0; i < v.size() && i < 200; ++i) {
    if (i) o << ",";
    o << __val(v[i]);
  }
  o << "]";
  return o.str();
}

template <typename T, size_t N>
std::string __val(const T (&a)[N]) {
  std::ostringstream o;
  o << "[";
  for (size_t i = 0; i < N; ++i) {
    if (i) o << ",";
    o << __val(a[i]);
  }
  o << "]";
  return o.str();
}

template <typename T>
std::string __val(const T& v) {
  using U = std::remove_cv_t<std::remove_reference_t<T>>;
  if constexpr (std::is_pointer_v<U>) {
    using P = std::remove_cv_t<std::remove_pointer_t<U>>;
    if (v == nullptr) return "null";
    if constexpr (has_next<P>::value) {
      return __listJson(v);
    } else if constexpr (has_children<P>::value) {
      return __treeJson(v);
    } else if constexpr (std::is_same_v<P, char>) {
      return __jsonStr(std::string(v));
    } else {
      return "null";  // 其它裸指针没法安全展开
    }
  } else if constexpr (has_next<U>::value) {
    return __listJson(&v);
  } else if constexpr (has_children<U>::value) {
    return __treeJson(&v);
  } else {
    std::ostringstream o;
    o << v;
    return o.str();
  }
}

/** 数组参数退化成指针后，靠长度变量展开 */
template <typename T>
std::string __arr(const T* p, int n) {
  if (p == nullptr) return "null";
  std::ostringstream o;
  o << "[";
  for (int i = 0; i < n && i < 200; ++i) {
    if (i) o << ",";
    o << __val(p[i]);
  }
  o << "]";
  return o.str();
}

/** 建节点：兼顾"只有 int 构造"和"纯聚合体"两种写法 */
template <typename T>
T* __mk(int v) {
  if constexpr (std::is_default_constructible_v<T>) {
    T* n = new T();
    n->val = v;
    if constexpr (has_next<T>::value) n->next = nullptr;
    if constexpr (has_children<T>::value) {
      n->left = nullptr;
      n->right = nullptr;
    }
    return n;
  } else {
    return new T(v);
  }
}

/** 调用户函数并把返回值打出来；返回 void 时就不打印。
 *  必须写在模板里，才能让 if constexpr 的 discarded 分支真正不实例化。 */
template <typename F, typename... A>
void callRet(F&& f, A&&... a) {
  using R = decltype(f(std::forward<A>(a)...));
  if constexpr (std::is_void_v<R>) {
    f(std::forward<A>(a)...);
  } else {
    auto&& r = f(std::forward<A>(a)...);
    std::cout << "@@RET@@" << __val(r) << "\n";
  }
}

inline void t(int line, std::initializer_list<std::pair<std::string, std::string>> kv) {
  std::ostringstream o;
  o << "{\"line\":" << (line - 1) << ",\"vars\":{";
  bool first = true;
  for (const auto& p : kv) {
    if (!first) o << ",";
    first = false;
    o << __jsonStr(p.first) << ":" << p.second;
  }
  o << "}}";
  __print(o.str());
}

}  // namespace __tr

#define __V(x) {#x, __tr::__val(x)}
#define __A(x, len) {#x, __tr::__arr(x, len)}
#define __T(line, ...) __tr::t(line, {__VA_ARGS__})
