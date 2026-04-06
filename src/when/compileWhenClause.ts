import expressionEval from "@casbin/expression-eval";
import type { CompiledWhenClause } from "../types/internal";

const { compile, parse } = expressionEval;

export function compileWhenClause(source: string): CompiledWhenClause {
  const ast = parse(source);
  const evaluateRaw = compile(source) as (context: Record<string, unknown>) => unknown;
  return {
    source,
    ast,
    evaluate(context) {
      return !!evaluateRaw(context);
    },
  };
}
