import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(js.configs.recommended, tseslint.configs.recommended, {
  rules: {
    // Quy tắc của dự án: packages/game KHÔNG được import React.
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            regex: "^(react|react-dom|next)(/.*)?$",
            message: "packages/game không được import React/Next. Hãy giao tiếp với web qua startGame().",
          },
        ],
      },
    ],
  },
});
