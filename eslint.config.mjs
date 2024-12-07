
import tseslint from "typescript-eslint";

import tailwind from "eslint-plugin-tailwindcss";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["src/**/*.{ts,tsx}"]},{ignores: [
    "**/node_modules/", ".git/", "main.js", "tailwind.config.js", "**/*.js"],},
    ...tseslint.configs.recommended,
  
  ...tailwind.configs["flat/recommended"],
  {  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/ban-ts-comment": "off",
    "no-prototype-builtins": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-this-alias": "error",
    "no-undef": "off",
    "no-cond-assign": "error",
    "no-async-promise-executor": "error",
    "@typescript-eslint/no-var-requires": "error",
    "@typescript-eslint/no-require-imports": "off",
    "no-useless-escape": "warn",
    "no-unsafe-optional-chaining": "off",
    "tailwindcss/no-custom-classname": "off",
    "@typescript-eslint/no-explicit-any": "off"
  }
  },
  

];