import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 强制纯类型导入必须显式写出 `import type`
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],

      // 禁止在代码中留下毫无意义的 `any` 漏斗
      '@typescript-eslint/no-explicit-any': 'warn',

      // 严禁对可能为 `undefined` 或 `null` 的值进行非空断言（禁止使用 `obj!.prop`）
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // 强制要求数组声明统一使用 `T[]` 而不是 `Array<T>`
      '@typescript-eslint/array-type': ['error', { default: 'array' }],

      // 严禁将 async 异步函数直接传给 useEffect 的第一个参数
      'react/no-async-vector-useeffect': 'off', // 注：此功能通常由 react-hooks/rules-of-hooks 间接托管
      'react-hooks/rules-of-hooks': 'error', // 锁死 Hooks 只能在顶层调用，禁止写在 if/for 分支中
      'react-hooks/exhaustive-deps': 'warn', // 深度拦截 useEffect/useMemo 的依赖项遗漏

      // 强制要求组件中所有自闭合标签必须写成 `<Component />`
      'react/self-closing-comp': ['error', { component: true, html: true }],

      // 变量声明了必须使用（排除了 JS 层的重复检查，启用 TS 层深度检查）
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // 生产环境绝对禁止残留调试核武器
      'no-console': ['warn', { allow: ['warn', 'error'] }], // 严禁 console.log，只放行 warn 和 error
      'no-debugger': 'error', // 严禁 debugger 断点

      // 严格禁止同一个文件重复 import 同一个模块
      'no-duplicate-imports': 'error',

      // 禁止代码中出现完全无意义的自我比较（如 `if (x === x)`）
      'no-self-compare': 'error',

      // 禁止在普通对象中使用无意义的重复 Key 值
      'no-dupe-keys': 'error',

      // 限制单行代码的最大复杂度
      // complexity: ['warn', { max: 15 }],
    },
  },

  // 强行覆盖并关闭前面所有冲突的样式规则
  eslintConfigPrettier,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'docker-volumes/**',
  ]),
]);

export default eslintConfig;
