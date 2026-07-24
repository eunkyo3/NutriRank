import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "dist/**",
      "node_modules/**",
      "drizzle/**",
      "data/**",
      "playwright-report/**",
      "test-results/**",
      // Next가 자동 생성하며 "should not be edited"라고 명시한 파일 (triple-slash reference 포함)
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
