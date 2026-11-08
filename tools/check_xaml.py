#!/usr/bin/env python3
"""Static checks for the MAUI XAML layer.

Without a .NET/MAUI toolchain the XAML compiler never runs, so this script performs the
checks that would otherwise fail the build (or silently produce an empty UI):

  1. every XAML file is well formed XML
  2. every {StaticResource key} resolves to a key defined in Colors/Styles/App.xaml
  3. every {Binding path} first segment exists as a property on one of our view models /
     display items (including [ObservableProperty] generated names)
  4. every bound *Command exists (generated from [RelayCommand])
  5. every image Source="*.png" exists under Resources/Images
  6. every custom view / converter prefix maps to a real CLR type
"""
from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "ForeverExiled.App"
NS = "{http://schemas.microsoft.com/dotnet/2021/maui}"
XNS = "{http://schemas.microsoft.com/winfx/2009/xaml}"

failures: list[str] = []


def fail(message: str) -> None:
    failures.append(message)


# ------------------------------------------------------------------ C# reflection


def collect_csharp_symbols() -> tuple[set[str], set[str]]:
    properties: set[str] = set()
    commands: set[str] = set()

    for path in (ROOT / "src").rglob("*.cs"):
        text = path.read_text(encoding="utf-8")

        # [ObservableProperty] private string _fooBar = "";  ->  FooBar
        for match in re.finditer(
            r"\[ObservableProperty\][\s\S]{0,200}?private\s+[\w\.<>\?\[\]]+\s+_(\w+)\s*[;=]",
            text,
        ):
            field = match.group(1)
            properties.add(field[:1].upper() + field[1:])

        # ordinary public properties / expression bodied members
        for match in re.finditer(r"public\s+(?:override\s+|virtual\s+|sealed\s+)?[\w\.<>\?\[\],\s]+?\s(\w+)\s*(?:\{|=>)", text):
            properties.add(match.group(1))

        # [RelayCommand] async Task FooAsync(...)  -> FooCommand
        for match in re.finditer(r"\[RelayCommand[^\]]*\]\s*(?:private|public|internal)?\s*(?:async\s+)?[\w\.<>\?]+\s+(\w+)\s*\(", text):
            name = match.group(1)
            if name.endswith("Async"):
                name = name[: -len("Async")]
            commands.add(name + "Command")

        # properties that return an ICommand directly
        for match in re.finditer(r"public\s+[\w\.<>]+\s+(\w+Command)\s*(?:\{|=>)", text):
            commands.add(match.group(1))

    return properties, commands


def collect_resources() -> set[str]:
    keys: set[str] = set()
    for path in APP.rglob("*.xaml"):
        text = path.read_text(encoding="utf-8")
        keys.update(re.findall(r"x:Key=\"([^\"]+)\"", text))
        # implicit styles have no key but are never referenced by StaticResource
    return keys


# ---------------------------------------------------------------------- XAML walk


def strip_ns(tag: str) -> str:
    return tag.split("}", 1)[1] if "}" in tag else tag


def local_name(tag: str) -> str:
    name = strip_ns(tag)
    return name.split(":", 1)[1] if ":" in name else name


IMAGE_RE = re.compile(r"^[\w\-]+\.(png|jpg|jpeg)$")


def check_file(path: Path, keys: set[str], properties: set[str], commands: set[str]) -> None:
    relative = path.relative_to(ROOT)
    try:
        tree = ET.parse(path)
    except ET.ParseError as error:
        fail(f"{relative}: XML is not well formed -> {error}")
        return

    # single-child containers: a second child is silently dropped at runtime, which is how an
    # overlay ended up inside a ScrollView and never appeared
    single_child = {"ScrollView", "ContentView", "Frame", "RefreshView"}
    for element in tree.iter():
        tag = local_name(element.tag)
        if tag in single_child:
            children = [child for child in list(element) if isinstance(child.tag, str)]
            if len(children) > 1:
                fail(f"{relative}:{tag} holds {len(children)} children - it accepts exactly one")

    for element in tree.iter():
        tag = local_name(element.tag)
        for attribute, value in element.attrib.items():
            attribute_name = strip_ns(attribute)

            # 2. static resources
            for key in re.findall(r"\{StaticResource\s+([^\}]+)\}", value):
                if key.strip() not in keys:
                    fail(f"{relative}:{tag} {attribute_name}: unknown StaticResource '{key.strip()}'")

            # 3./4. bindings
            for expression in re.findall(r"\{Binding([^\}]*)\}", value):
                body = expression.strip()
                if not body:
                    continue
                first = body.split(",")[0].strip()
                target = property_target(first)
                if target is None:
                    continue
                if target not in properties and target not in commands:
                    fail(f"{relative}:{tag} {attribute_name}: binding target '{target}' not found in C#")
                if target.endswith("Command") and target not in commands and target not in properties:
                    fail(f"{relative}:{tag} {attribute_name}: command '{target}' is not generated")

            # 5. images
            if attribute_name == "Source" and IMAGE_RE.match(value):
                if not (APP / "Resources" / "Images" / value).exists():
                    fail(f"{relative}: missing image Resources/Images/{value}")


def property_target(first: str) -> str | None:
    first = first.strip()
    if first in {".", "BindingContext", "Self"} or first.startswith("{"):
        return None
    name = first.split(".")[0].split("[")[0].strip()
    if not name or not re.match(r"^[A-Za-z_]\w*$", name):
        return None
    return name


def check_code_behind() -> None:
    for xaml in list(APP.rglob("*.xaml")):
        text = xaml.read_text(encoding="utf-8")
        if "<ResourceDictionary" in text and "x:Class" not in text:
            continue  # merged theme dictionary, no code-behind by design
        code = xaml.with_suffix(".xaml.cs")
        if not code.exists():
            fail(f"{xaml.relative_to(ROOT)}: missing code-behind {code.name}")


def check_custom_prefixes(properties: set[str], commands: set[str], keys: set[str]) -> None:
    for xaml in APP.rglob("*.xaml"):
        text = xaml.read_text(encoding="utf-8")
        prefixes = dict(re.findall(r"xmlns:(\w+)=\"clr-namespace:([^\"]+)\"", text))
        for prefix, namespace in prefixes.items():
            cls = namespace.split(";")[0].split(".")[-1]
            directory = APP / cls
            if not directory.exists() and not list(APP.rglob(cls + ".cs")):
                fail(f"{xaml.relative_to(ROOT)}: prefix '{prefix}' -> namespace '{namespace}' has no types in the tree")


def main() -> int:
    properties, commands = collect_csharp_symbols()
    keys = collect_resources()

    for path in sorted(APP.rglob("*.xaml")):
        check_file(path, keys, properties, commands)

    check_code_behind()
    check_custom_prefixes(properties, commands, keys)

    print(f"resources: {len(keys)}   properties: {len(properties)}   commands: {len(commands)}")
    if failures:
        print(f"\n{len(failures)} problem(s):")
        for problem in failures:
            print("  " + problem)
        return 1

    print("XAML checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
