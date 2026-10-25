import java.lang.reflect.Array;
import java.util.Collection;
import java.util.Map;

/** 用户代码里的每条语句会把快照打到 stdout，父进程按 @@T@@ 前缀分离 */
public class Trace {

    public static void t(int line, Object... kv) {
        StringBuilder o = new StringBuilder();
        o.append("{\"line\":").append(line - 1).append(",\"vars\":{");
        for (int i = 0; i + 1 < kv.length; i += 2) {
            if (i > 0) o.append(',');
            o.append('"').append(kv[i]).append("\":").append(json(kv[i + 1]));
        }
        o.append("}}");
        System.out.println("@@T@@" + o);
    }

    static String json(Object v) {
        if (v == null) return "null";
        Class<?> c = v.getClass();

        if (isTreeNode(c)) return treeJson(v, c);
        if (isListNode(c)) return listJson(v, c);

        if (v instanceof String || v instanceof Character) return quote(v.toString());
        if (v instanceof Boolean || v instanceof Number) {
            if (v instanceof Double && (((Double) v).isNaN() || ((Double) v).isInfinite())) return "null";
            if (v instanceof Float && (((Float) v).isNaN() || ((Float) v).isInfinite())) return "null";
            return v.toString();
        }

        if (c.isArray()) {
            int n = Array.getLength(v);
            StringBuilder o = new StringBuilder("[");
            for (int i = 0; i < n; i++) {
                if (i > 0) o.append(',');
                o.append(json(Array.get(v, i)));
            }
            return o.append(']').toString();
        }

        if (v instanceof Collection<?>) {
            StringBuilder o = new StringBuilder("[");
            boolean first = true;
            for (Object x : (Collection<?>) v) {
                if (!first) o.append(',');
                first = false;
                o.append(json(x));
            }
            return o.append(']').toString();
        }

        if (v instanceof Map<?, ?>) {
            StringBuilder o = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet()) {
                if (!first) o.append(',');
                first = false;
                o.append(quote(String.valueOf(e.getKey()))).append(':').append(json(e.getValue()));
            }
            return o.append('}').toString();
        }

        return quote(v.toString());
    }

    /** 靠字段名认链表节点：有 val + next，且没有 left/right */
    static boolean isListNode(Class<?> c) {
        try {
            c.getField("val");
            c.getField("next");
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** 沿 next 走，输出 {"__list":[值...]} */
    static String listJson(Object head, Class<?> c) {
        try {
            java.lang.reflect.Field fVal = c.getField("val");
            java.lang.reflect.Field fNext = c.getField("next");
            StringBuilder o = new StringBuilder("{\"__list\":[");
            Object cur = head;
            int guard = 0;
            while (cur != null && guard < 200) {
                if (guard > 0) o.append(',');
                o.append(json(fVal.get(cur)));
                cur = fNext.get(cur);
                guard++;
            }
            return o.append("]}").toString();
        } catch (Exception e) {
            return "null";
        }
    }

    /** 靠字段名认树节点，不依赖具体类型（用户的 TreeNode 可能是自己写的） */
    static boolean isTreeNode(Class<?> c) {
        try {
            c.getField("val");
            c.getField("left");
            c.getField("right");
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** 按层序输出，末尾的 null 去掉，前端能直接按 LeetCode 的格式还原 */
    static String treeJson(Object root, Class<?> c) {
        try {
            java.lang.reflect.Field fVal = c.getField("val");
            java.lang.reflect.Field fLeft = c.getField("left");
            java.lang.reflect.Field fRight = c.getField("right");
            java.util.List<Object> vals = new java.util.ArrayList<>();
            java.util.Deque<Object> q = new java.util.LinkedList<>();  // ArrayDeque 不收 null
            q.add(root);
            while (!q.isEmpty() && vals.size() < 400) {
                Object cur = q.poll();
                if (cur == null) {
                    vals.add(null);
                    continue;
                }
                vals.add(fVal.get(cur));
                q.add(fLeft.get(cur));
                q.add(fRight.get(cur));
            }
            while (!vals.isEmpty() && vals.get(vals.size() - 1) == null) {
                vals.remove(vals.size() - 1);
            }
            StringBuilder o = new StringBuilder("{\"__tree\":[");
            for (int i = 0; i < vals.size(); i++) {
                if (i > 0) o.append(',');
                o.append(vals.get(i) == null ? "null" : vals.get(i).toString());
            }
            return o.append("]}").toString();
        } catch (Exception e) {
            return "null";
        }
    }

    static String quote(String s) {
        StringBuilder o = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            switch (ch) {
                case '"': o.append("\\\""); break;
                case '\\': o.append("\\\\"); break;
                case '\n': o.append("\\n"); break;
                case '\t': o.append("\\t"); break;
                case '\r': o.append("\\r"); break;
                default: o.append(ch);
            }
        }
        return o.append('"').toString();
    }
}
