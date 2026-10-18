import js from "@eslint/js";
import tseslint from "typescript-eslint";

const eslintConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [".next/**", "logo-animation/**", "node_modules/**", ".pgdata*/**", "drizzle/**"]
  },
  {
    languageOptions: {
      globals: {
        React: "readonly",
        console: "readonly",
        process: "readonly",
        crypto: "readonly",
        Request: "readonly",
        Response: "readonly",
        FormData: "readonly",
        window: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly"
      }
    }
  }
];

export default eslintConfig;
