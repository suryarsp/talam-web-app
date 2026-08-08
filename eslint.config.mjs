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
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'MemberExpression[object.name="process"][property.name="env"][parent.property.name=/^NEXT_PUBLIC_SUPABASE_SERVICE_ROLE|^NEXT_PUBLIC_.*SECRET|^NEXT_PUBLIC_.*KEY.*SECRET/]',
          message: "Never expose secret keys with NEXT_PUBLIC_ prefix.",
        },
      ],
    },
  },
  {
    // Vendored animation components (magicui-style, copy-pasted not authored): their
    // ref-during-render and setState-in-effect patterns are intentional perf/init idioms
    // that predate reactCompiler's stricter hook rules. Rewriting risks visual regressions
    // for no behavior change, so the rules are scoped off here instead of per-line disabled.
    files: [
      "components/ui/carousel.tsx",
      "components/ui/dot-pattern.tsx",
      "components/ui/magic-card.tsx",
      "components/ui/particles.tsx",
      "components/ui/typing-animation.tsx",
    ],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
