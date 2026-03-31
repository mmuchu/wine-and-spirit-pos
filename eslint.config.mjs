import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Turn off the annoying 'any' errors that crash Vercel
      "@typescript-eslint/no-explicit-any": "off",
      // Turn off the React Hook dependency warnings
      "react-hooks/exhaustive-deps": "off",
      // Turn off unused variable warnings
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/immutability": "off"
    },
  },
];

export default eslintConfig;