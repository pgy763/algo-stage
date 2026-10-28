import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

/**
 * 只当"护栏"，不当"装修队"：
 * 抓真正的问题（未定义变量、未使用变量、重复 key、可疑比较），
 * 排版交给 Prettier，所以这里把 vue 的排版类规则关掉。
 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'docs/**', '.dbg/**', '.shots/**', '.scratch/**', '*.log'],
  },

  ...pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.worker },
    },
    rules: {
      // ---- 排版交给 Prettier ----
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/attributes-order': 'off',

      // ---- 真正想抓的 ----
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-undef': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],
      'no-var': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off', // 旁白是本地字符串，已做 escapeHtml
      'vue/require-default-prop': 'off',
    },
  },

  // Node 侧脚本（runner 服务、自测、配置文件）
  {
    files: ['runner/**/*.{js,mjs}', '*.config.js', 'eslint.config.js', 'src/test/**/*.js'],
    languageOptions: {
      globals: { ...globals.node }
    },
    rules: {
      // 命令行工具和服务端日志就是靠 console 输出的
      'no-console': 'off'
      // 调试开关按环境变量打开，属于合理用法
    }
  }
]
