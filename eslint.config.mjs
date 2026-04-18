import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";

export default [
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { react: reactPlugin },
    rules: {
      "react/button-has-type": "error",
    },
  },
];
