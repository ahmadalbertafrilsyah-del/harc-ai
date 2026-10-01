import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Melonggarkan aturan gaya/strictness yang bukan bug runtime. Build tetap
    // lolos tanpa ini; dimatikan agar keluaran lint fokus pada masalah nyata.
    rules: {
      // Basis kode banyak memakai `any` untuk data Firestore & objek error.
      "@typescript-eslint/no-explicit-any": "off",
      // Aturan React Compiler yang sangat ketat — hanya hint performa/gaya.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/static-components": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      // Dependency effect & <img> diturunkan ke peringatan, bukan error.
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
]);

export default eslintConfig;
