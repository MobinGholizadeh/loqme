import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const sourceRoot = path.resolve("apps/web/src");
const persianLetter = /[\u0621-\u063a\u0641-\u064a\u066e-\u066f\u0671-\u06d3\u06fa-\u06fc\u06ff]/;
const persianLetterBeforePeriod = /[\u0621-\u063a\u0641-\u064a\u066e-\u066f\u0671-\u06d3\u06fa-\u06fc\u06ff]\./;

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

describe("Persian product copy", () => {
  it("does not end Persian sentences with ASCII full stops or three-dot ellipses", () => {
    const violations: string[] = [];

    for (const file of sourceFiles(sourceRoot)) {
      const sourceText = fs.readFileSync(file, "utf8");
      const source = ts.createSourceFile(
        file,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );

      function inspect(node: ts.Node) {
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node) ||
          ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) ||
          ts.isTemplateTail(node) ||
          ts.isJsxText(node)
        ) {
          const text = node.getText(source);
          if (persianLetter.test(text) && (persianLetterBeforePeriod.test(text) || text.includes("..."))) {
            const position = source.getLineAndCharacterOfPosition(node.getStart(source));
            violations.push(`${path.relative(process.cwd(), file)}:${position.line + 1}`);
          }
        }
        ts.forEachChild(node, inspect);
      }

      inspect(source);
    }

    expect(violations).toEqual([]);
  });
});
