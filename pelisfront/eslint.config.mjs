import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Variables descartadas a propósito (ej. al separar props) empiezan con "_".
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Capas (docs/FRONTEND.md §5): shared no conoce a nadie de arriba.
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/features/*", "@/app/*"], message: "shared/ no puede importar de features/ ni de app/." }] }],
    },
  },
  {
    // Una feature no usa otra feature directamente: lo común va a shared/.
    files: ["src/features/*/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/features/*/*"], message: "Una feature no importa otra: mueve lo común a shared/." }] }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
