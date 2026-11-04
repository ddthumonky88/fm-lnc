#!/usr/bin/env python3
"""Analyze records and change-like entries in a Football Manager XML export."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


CHANGE_WORDS = ("change", "changes", "changed", "edit", "update", "delete", "remove", "add", "create")
TYPE_FIELDS = ("type", "action", "operation", "change_type", "database_table_type", "object_type")
ID_FIELDS = ("db_unique_id", "db_random_id", "id", "uid", "object_id", "record_id", "database_id")


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def scalar_value(element: ET.Element) -> Any:
    attrs = {local_name(k): v for k, v in element.attrib.items()}
    for key in ("value", "val", "text", "name"):
        if key in attrs:
            value = attrs[key]
            tag = local_name(element.tag)
            if tag in {"integer", "large", "unsigned", "unsigned_large"}:
                try:
                    return int(value)
                except ValueError:
                    return value
            if tag == "float":
                try:
                    return float(value)
                except ValueError:
                    return value
            if tag == "boolean":
                return value.lower() == "true"
            return value
    text = (element.text or "").strip()
    return text if text else None


def record_to_dict(element: ET.Element) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in element.attrib.items():
        result[f"@{local_name(key)}"] = value

    for child in list(element):
        tag = local_name(child.tag)
        child_id = child.attrib.get("id") or child.attrib.get("name")
        key = child_id or tag
        if list(child):
            value: Any = record_to_dict(child)
        else:
            value = scalar_value(child)
            if value is None and child.attrib:
                value = {local_name(k): v for k, v in child.attrib.items()}

        if key in result:
            current = result[key]
            result[key] = current + [value] if isinstance(current, list) else [current, value]
        else:
            result[key] = value
    return result


def contains_change_word(*values: Any) -> bool:
    haystack = " ".join(str(value).lower() for value in values if value is not None)
    return any(word in haystack for word in CHANGE_WORDS)


def first_value(record: dict[str, Any], keys: tuple[str, ...]) -> Any:
    lowered = {str(key).lower(): value for key, value in record.items()}
    for key in keys:
        if key in lowered:
            return lowered[key]
    return None


def change_summary(element: ET.Element, path: list[str]) -> dict[str, Any]:
    record = record_to_dict(element)
    return {
        "path": "/".join(path),
        "tag": local_name(element.tag),
        "id": first_value(record, ID_FIELDS),
        "type": first_value(record, TYPE_FIELDS),
        "fields": record,
    }


def analyze(path: Path, sample_limit: int) -> dict[str, Any]:
    prefix = path.read_bytes()[:4096].upper()
    if b"<!DOCTYPE" in prefix or b"<!ENTITY" in prefix:
        raise ValueError("DTD/ENTITY declarations are not supported")

    tag_counts: Counter[str] = Counter()
    id_counts: Counter[str] = Counter()
    change_types: Counter[str] = Counter()
    property_counts: Counter[tuple[str, str]] = Counter()
    version_counts: Counter[str] = Counter()
    value_type_counts: Counter[str] = Counter()
    changed_objects: set[tuple[str, str]] = set()
    client_field_count = 0
    language_field_count = 0
    samples: list[dict[str, Any]] = []
    stack: list[str] = []
    total_records = 0
    total_lists = 0
    total_change_candidates = 0
    root_tag = ""

    for event, element in ET.iterparse(path, events=("start", "end")):
        tag = local_name(element.tag)
        if event == "start":
            element_id = element.attrib.get("id") or element.attrib.get("name")
            stack.append(f"{tag}[{element_id}]" if element_id else tag)
            if not root_tag:
                root_tag = tag
            continue

        tag_counts[tag] += 1
        element_id = element.attrib.get("id") or element.attrib.get("name")
        if element_id:
            id_counts[element_id] += 1
        if tag == "record":
            total_records += 1
        elif tag == "list":
            total_lists += 1

        child_ids = {
            str(child.attrib.get("id", "")).lower()
            for child in list(element)
            if child.attrib.get("id")
        }
        is_fm_db_change = tag == "record" and {
            "database_table_type",
            "property",
            "new_value",
        }.issubset(child_ids)
        record = record_to_dict(element) if is_fm_db_change else {}
        candidate = is_fm_db_change
        if candidate:
            total_change_candidates += 1
            change_type = first_value(record, TYPE_FIELDS) or element_id or tag
            change_types[str(change_type)] += 1
            table_type = str(record.get("database_table_type", "unknown"))
            property_id = str(record.get("property", "unknown"))
            property_counts[(table_type, property_id)] += 1
            version_counts[str(record.get("version", "unknown"))] += 1
            object_id = record.get("db_unique_id") or record.get("db_random_id") or "unknown"
            changed_objects.add((table_type, str(object_id)))
            client_field_count += int(record.get("is_client_field") is True)
            language_field_count += int(record.get("is_language_field") is True)
            new_value_element = next(
                (child for child in list(element) if child.attrib.get("id") == "new_value"),
                None,
            )
            value_type_counts[local_name(new_value_element.tag) if new_value_element is not None else "unknown"] += 1
            if len(samples) < sample_limit:
                samples.append(change_summary(element, stack.copy()))

        stack.pop()
        if tag == "record":
            element.clear()

    properties_by_table: dict[str, dict[str, int]] = {}
    for (table_type, property_id), count in property_counts.most_common():
        properties_by_table.setdefault(table_type, {})[property_id] = count

    return {
        "file": str(path.resolve()),
        "sizeBytes": path.stat().st_size,
        "rootTag": root_tag,
        "summary": {
            "elements": sum(tag_counts.values()),
            "records": total_records,
            "lists": total_lists,
            "changeCandidates": total_change_candidates,
            "changedObjects": len(changed_objects),
            "clientFields": client_field_count,
            "languageFields": language_field_count,
        },
        "topTags": dict(tag_counts.most_common(30)),
        "topIds": dict(id_counts.most_common(50)),
        "changeTypes": dict(change_types.most_common()),
        "propertiesByTable": properties_by_table,
        "versions": dict(version_counts.most_common()),
        "newValueTypes": dict(value_type_counts.most_common()),
        "changeSamples": samples,
        "notes": [
            "FM database changes are records containing database_table_type, db_unique_id, property and new_value.",
            "Numeric table/property IDs are preserved because their display-name mapping is not embedded in the XML.",
        ],
    }


def markdown_report(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# FM24 XML change analysis",
        "",
        f"- File: `{report['file']}`",
        f"- Size: `{report['sizeBytes']:,}` bytes",
        f"- Root tag: `{report['rootTag']}`",
        f"- Elements: `{summary['elements']:,}`",
        f"- Records: `{summary['records']:,}`",
        f"- Lists: `{summary['lists']:,}`",
        f"- Change candidates: `{summary['changeCandidates']:,}`",
        f"- Changed objects: `{summary['changedObjects']:,}`",
        f"- Client fields: `{summary['clientFields']:,}`",
        f"- Language fields: `{summary['languageFields']:,}`",
        "",
        "## Change types",
        "",
        "| Type | Count |",
        "| --- | ---: |",
    ]
    if report["changeTypes"]:
        lines.extend(f"| `{key}` | {value:,} |" for key, value in report["changeTypes"].items())
    else:
        lines.append("| No change-like entries detected | 0 |")

    lines.extend(["", "## Top element IDs", "", "| ID | Count |", "| --- | ---: |"])
    lines.extend(f"| `{key}` | {value:,} |" for key, value in report["topIds"].items())
    lines.extend(["", "## Sample changes", ""])
    for index, sample in enumerate(report["changeSamples"], 1):
        lines.extend(
            [
                f"### {index}. `{sample['path']}`",
                "",
                "```json",
                json.dumps(sample, ensure_ascii=False, indent=2),
                "```",
                "",
            ]
        )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze change records in an FM24 XML file")
    parser.add_argument("xml", type=Path, help="Path to fm24.xml")
    parser.add_argument("--format", choices=("json", "markdown"), default="json")
    parser.add_argument("--output", type=Path, help="Write the report to this file")
    parser.add_argument("--samples", type=int, default=25, help="Maximum sampled changes (default: 25)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.xml.is_file():
        print(f"ERROR: XML file not found: {args.xml}", file=sys.stderr)
        return 2
    try:
        report = analyze(args.xml, max(0, args.samples))
    except (ET.ParseError, OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    content = markdown_report(report) if args.format == "markdown" else json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(content + "\n", encoding="utf-8")
        print(f"Report written to: {args.output.resolve()}")
    else:
        print(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
