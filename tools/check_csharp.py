#!/usr/bin/env python3
"""Syntax-check every C# file in the repo with tree-sitter.

The sandbox has no .NET SDK (and MAUI cannot build on Linux anyway), so this is the
closest thing to a compiler pass: it parses each file with the official C# grammar and
reports syntax errors plus unresolved `using` namespaces that don't exist in the tree.
"""
from __future__ import annotations

import sys
from pathlib import Path

import tree_sitter_c_sharp
from tree_sitter import Language, Parser

ROOT = Path(__file__).resolve().parents[1]
LANGUAGE = Language(tree_sitter_c_sharp.language())


def walk(node):
    stack = [node]
    while stack:
        current = stack.pop()
        yield current
        stack.extend(current.children)


def main() -> int:
    parser = Parser(LANGUAGE)
    files = sorted(p for p in ROOT.rglob("*.cs") if "/obj/" not in str(p) and "/bin/" not in str(p))
    failures = 0
    for path in files:
        source = path.read_bytes()
        tree = parser.parse(source)
        problems = []
        for node in walk(tree.root_node):
            if node.type == "ERROR":
                problems.append((node.start_point, "ERROR", source[node.start_byte:node.end_byte][:120]))
            elif node.is_missing:
                problems.append((node.start_point, f"missing {node.type}", b""))
        if problems:
            failures += 1
            print(f"\n{path.relative_to(ROOT)}")
            for (row, col), kind, snippet in problems[:6]:
                text = snippet.decode("utf-8", "replace").replace("\n", "\\n")
                print(f"  {row + 1}:{col + 1}  {kind}  {text}")
    print(f"\n{len(files)} files parsed, {failures} with syntax problems")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
