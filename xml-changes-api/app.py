#!/usr/bin/env python3
"""Standalone HTTP API for the FM24 changes.jsonl export."""

from __future__ import annotations

import json
import os
import sqlite3
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[1]
CHANGES_FILE = Path(os.getenv("CHANGES_FILE", ROOT / "fm24-report" / "changes.jsonl"))
SUMMARY_FILE = Path(os.getenv("SUMMARY_FILE", ROOT / "fm24-report" / "summary.json"))
INDEX_FILE = Path(os.getenv("INDEX_FILE", ROOT / "fm24-report" / "changes-v2.sqlite"))
HOST = os.getenv("XML_API_HOST", "127.0.0.1")
PORT = int(os.getenv("XML_API_PORT", "3003"))
MAX_PAGE_SIZE = 500


def scalar(query: dict[str, list[str]], name: str, default: str | None = None) -> str | None:
    values = query.get(name)
    return values[0] if values else default


def boolean(value: str | None) -> bool | None:
    if value is None or value == "":
        return None
    normalized = value.lower()
    if normalized in {"true", "1", "yes"}:
        return True
    if normalized in {"false", "0", "no"}:
        return False
    raise ValueError(f"Invalid boolean: {value}")


def formatted_change(raw: dict[str, Any], line_number: int, include_raw: bool = False) -> dict[str, Any]:
    fields = raw.get("fields") or {}
    unique_id = fields.get("db_unique_id")
    random_id = fields.get("db_random_id")
    converted_id = (int(unique_id) & 0xFFFFFFFF) if unique_id is not None else None
    value = fields.get("new_value")
    result: dict[str, Any] = {
        "changeId": line_number,
        "object": {
            "id": str(unique_id if unique_id is not None else random_id),
            "uniqueId": unique_id,
            "randomId": random_id,
            "convertedId": converted_id,
            "tableType": fields.get("database_table_type", raw.get("type")),
        },
        "property": {
            "id": fields.get("property"),
            "value": value,
            "valueType": type(value).__name__.lower() if value is not None else "null",
        },
        "version": fields.get("version"),
        "flags": {
            "clientField": bool(fields.get("is_client_field", False)),
            "languageField": bool(fields.get("is_language_field", False)),
        },
        "source": {"path": raw.get("path"), "tag": raw.get("tag")},
    }
    if include_raw:
        result["raw"] = raw
    return result


def iter_changes() -> Iterator[tuple[int, dict[str, Any]]]:
    with CHANGES_FILE.open("r", encoding="utf-8") as source:
        for line_number, line in enumerate(source, 1):
            if line.strip():
                yield line_number, json.loads(line)


def ensure_index() -> None:
    if INDEX_FILE.is_file() and INDEX_FILE.stat().st_mtime >= CHANGES_FILE.stat().st_mtime:
        try:
            with sqlite3.connect(INDEX_FILE) as existing:
                columns = {row[1] for row in existing.execute("PRAGMA table_info(changes)")}
            if "converted_id" in columns:
                return
        except sqlite3.DatabaseError:
            pass
    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary = INDEX_FILE.with_suffix(".sqlite.tmp")
    if temporary.exists():
        temporary.unlink()
    print(f"Building index: {INDEX_FILE}")
    connection = sqlite3.connect(temporary)
    try:
        connection.execute(
            "CREATE TABLE changes (line_no INTEGER PRIMARY KEY, table_type TEXT, property_id TEXT, "
            "unique_id TEXT, random_id TEXT, converted_id TEXT, client_field INTEGER, language_field INTEGER, value_text TEXT, raw TEXT NOT NULL)"
        )
        batch = []
        for line_number, raw in iter_changes():
            fields = raw.get("fields") or {}
            value = fields.get("new_value")
            batch.append(
                (
                    line_number,
                    str(fields.get("database_table_type", raw.get("type"))),
                    str(fields.get("property")),
                    str(fields.get("db_unique_id")) if fields.get("db_unique_id") is not None else None,
                    str(fields.get("db_random_id")) if fields.get("db_random_id") is not None else None,
                    str(int(fields["db_unique_id"]) & 0xFFFFFFFF) if fields.get("db_unique_id") is not None else None,
                    int(bool(fields.get("is_client_field", False))),
                    int(bool(fields.get("is_language_field", False))),
                    json.dumps(value, ensure_ascii=False).lower(),
                    json.dumps(raw, ensure_ascii=False, separators=(",", ":")),
                )
            )
            if len(batch) >= 2_000:
                connection.executemany("INSERT INTO changes VALUES (?,?,?,?,?,?,?,?,?,?)", batch)
                batch.clear()
        if batch:
            connection.executemany("INSERT INTO changes VALUES (?,?,?,?,?,?,?,?,?,?)", batch)
        connection.executescript(
            "CREATE INDEX idx_changes_table ON changes(table_type);"
            "CREATE INDEX idx_changes_property ON changes(property_id);"
            "CREATE INDEX idx_changes_unique ON changes(unique_id);"
            "CREATE INDEX idx_changes_random ON changes(random_id);"
            "CREATE INDEX idx_changes_converted ON changes(converted_id);"
            "CREATE INDEX idx_changes_flags ON changes(client_field,language_field);"
        )
        connection.commit()
    finally:
        connection.close()
    temporary.replace(INDEX_FILE)


def database() -> sqlite3.Connection:
    connection = sqlite3.connect(INDEX_FILE)
    connection.row_factory = sqlite3.Row
    return connection


def matches(raw: dict[str, Any], filters: dict[str, Any]) -> bool:
    fields = raw.get("fields") or {}
    table_type = fields.get("database_table_type", raw.get("type"))
    unique_id = fields.get("db_unique_id")
    converted_id = (int(unique_id) & 0xFFFFFFFF) if unique_id is not None else None
    object_ids = {
        str(value) for value in (unique_id, fields.get("db_random_id"), converted_id) if value is not None
    }
    if filters["tableType"] is not None and str(table_type) != filters["tableType"]:
        return False
    if filters["propertyId"] is not None and str(fields.get("property")) != filters["propertyId"]:
        return False
    if filters["objectId"] is not None and filters["objectId"] not in object_ids:
        return False
    if filters["clientField"] is not None and bool(fields.get("is_client_field", False)) != filters["clientField"]:
        return False
    if filters["languageField"] is not None and bool(fields.get("is_language_field", False)) != filters["languageField"]:
        return False
    keyword = filters["q"]
    if keyword and keyword not in json.dumps(fields.get("new_value"), ensure_ascii=False).lower():
        return False
    return True


class ApiHandler(BaseHTTPRequestHandler):
    server_version = "FM24XMLChangesAPI/1.0"

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def send_json(self, status: HTTPStatus, payload: Any) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        try:
            parsed = urlparse(self.path)
            query = parse_qs(parsed.query)
            if parsed.path == "/health":
                self.send_json(HTTPStatus.OK, {"status": "ok", "changesFile": str(CHANGES_FILE), "indexFile": str(INDEX_FILE)})
            elif parsed.path == "/api/summary":
                self.summary()
            elif parsed.path == "/api/changes":
                self.changes(query)
            elif parsed.path.startswith("/api/objects/"):
                self.object_changes(parsed.path.rsplit("/", 1)[-1], query)
            elif parsed.path in {"/", "/docs"}:
                self.docs()
            else:
                self.send_json(HTTPStatus.NOT_FOUND, {"status": 404, "message": "Endpoint not found"})
        except ValueError as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"status": 400, "message": str(exc)})
        except (OSError, json.JSONDecodeError) as exc:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"status": 500, "message": str(exc)})

    def summary(self) -> None:
        if not SUMMARY_FILE.is_file():
            raise ValueError(f"Summary file not found: {SUMMARY_FILE}")
        self.send_json(HTTPStatus.OK, json.loads(SUMMARY_FILE.read_text(encoding="utf-8")))

    def changes(self, query: dict[str, list[str]]) -> None:
        page = max(0, int(scalar(query, "page", "0") or 0))
        size = min(MAX_PAGE_SIZE, max(1, int(scalar(query, "size", "50") or 50)))
        include_raw = boolean(scalar(query, "includeRaw")) is True
        filters = {
            "tableType": scalar(query, "tableType"),
            "propertyId": scalar(query, "propertyId"),
            "objectId": scalar(query, "objectId"),
            "clientField": boolean(scalar(query, "clientField")),
            "languageField": boolean(scalar(query, "languageField")),
            "q": (scalar(query, "q", "") or "").lower(),
        }
        clauses: list[str] = []
        arguments: list[Any] = []
        columns = {
            "tableType": "table_type", "propertyId": "property_id",
            "clientField": "client_field", "languageField": "language_field",
        }
        for filter_name, column in columns.items():
            value = filters[filter_name]
            if value is not None:
                clauses.append(f"{column}=?")
                arguments.append(int(value) if isinstance(value, bool) else value)
        if filters["objectId"] is not None:
            clauses.append("(unique_id=? OR random_id=? OR converted_id=?)")
            arguments.extend([filters["objectId"], filters["objectId"], filters["objectId"]])
        if filters["q"]:
            clauses.append("value_text LIKE ?")
            arguments.append(f"%{filters['q']}%")
        where = " WHERE " + " AND ".join(clauses) if clauses else ""
        with database() as connection:
            total = connection.execute("SELECT COUNT(*) FROM changes" + where, arguments).fetchone()[0]
            rows = connection.execute(
                "SELECT line_no,raw FROM changes" + where + " ORDER BY line_no LIMIT ? OFFSET ?",
                [*arguments, size, page * size],
            ).fetchall()
        content = [formatted_change(json.loads(row["raw"]), row["line_no"], include_raw) for row in rows]
        self.send_json(
            HTTPStatus.OK,
            {
                "status": 200,
                "data": {
                    "content": content,
                    "page": page,
                    "size": size,
                    "totalElements": total,
                    "totalPages": (total + size - 1) // size,
                    "first": page == 0,
                    "last": (page + 1) * size >= total,
                    "filters": {key: value for key, value in filters.items() if value not in (None, "")},
                },
            },
        )

    def object_changes(self, object_id: str, query: dict[str, list[str]]) -> None:
        include_raw = boolean(scalar(query, "includeRaw")) is True
        with database() as connection:
            rows = connection.execute(
                "SELECT line_no,raw FROM changes WHERE unique_id=? OR random_id=? OR converted_id=? ORDER BY line_no",
                (object_id, object_id, object_id),
            ).fetchall()
        content = [formatted_change(json.loads(row["raw"]), row["line_no"], include_raw) for row in rows]
        self.send_json(
            HTTPStatus.OK,
            {"status": 200, "data": {"objectId": object_id, "content": content, "totalElements": len(content)}},
        )

    def docs(self) -> None:
        self.send_json(
            HTTPStatus.OK,
            {
                "name": "FM24 XML Changes API",
                "version": "1.0.0",
                "endpoints": {
                    "GET /health": "API status",
                    "GET /api/summary": "XML analysis summary",
                    "GET /api/changes": "Formatted, filtered and paginated changes",
                    "GET /api/objects/{id}": "Every change belonging to an object",
                },
                "changeFilters": [
                    "page", "size", "tableType", "propertyId", "objectId",
                    "clientField", "languageField", "q", "includeRaw",
                ],
            },
        )

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"{self.address_string()} - {fmt % args}")


def main() -> int:
    if not CHANGES_FILE.is_file():
        print(f"ERROR: changes file not found: {CHANGES_FILE}", file=sys.stderr)
        print("Run .\\run-analyze-xml.bat first.", file=sys.stderr)
        return 2
    ensure_index()
    server = ThreadingHTTPServer((HOST, PORT), ApiHandler)
    print(f"FM24 XML Changes API: http://{HOST}:{PORT}")
    print(f"Data: {CHANGES_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
