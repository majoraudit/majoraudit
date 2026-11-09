from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import pylibmql
from django.conf import settings


SAFE_ID = re.compile(r"^[a-z0-9_]+$")


class CatalogError(ValueError):
    pass


@dataclass(frozen=True)
class ProgramAsset:
    catalog_year: str
    major_id: str
    program_id: str
    semantic_program_id: str
    major: dict
    source: str
    institution: dict
    ir: dict


class MajorCatalog:
    def __init__(self, root: Path | None = None):
        self.root = Path(root or settings.MAJORS_DATA_ROOT).resolve()

    @property
    def revision(self) -> str:
        path = self.root / "REVISION"
        return path.read_text(encoding="utf-8").strip() if path.is_file() else "development"

    def year_root(self, catalog_year: str) -> Path:
        parts = catalog_year.split("-")
        if len(parts) != 2 or not all(part.isdigit() and len(part) == 4 for part in parts):
            raise CatalogError(f"invalid catalog year: {catalog_year}")
        compact = f"{parts[0][-2:]}{parts[1][-2:]}"
        path = (self.root / compact).resolve()
        if self.root not in path.parents or not path.is_dir():
            raise CatalogError(f"unknown catalog year: {catalog_year}")
        return path

    def manifest(self, catalog_year: str) -> dict:
        return json.loads((self.year_root(catalog_year) / "manifest.json").read_text(encoding="utf-8"))

    def list_majors(self, catalog_year: str) -> list[dict]:
        manifest = self.manifest(catalog_year)
        entries = list(manifest["majors"])
        year_root = self.year_root(catalog_year)
        for major_id in manifest.get("collegePrograms", []):
            metadata_path = year_root / major_id / f"{major_id}.json"
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            entries.append({
                "id": major_id,
                "name": metadata["name"],
                "catalogPath": metadata.get("catalogLink", ""),
                "programs": [Path(filename).stem for filename in metadata["specializations"]],
                "kind": "college_program",
            })
        return entries

    @lru_cache(maxsize=256)
    def program(self, catalog_year: str, major_id: str, program_id: str) -> ProgramAsset:
        if not SAFE_ID.fullmatch(major_id) or not SAFE_ID.fullmatch(program_id):
            raise CatalogError("invalid major or program identifier")
        year_root = self.year_root(catalog_year)
        entry = next((m for m in self.list_majors(catalog_year) if m["id"] == major_id), None)
        if entry is None or program_id not in entry["programs"]:
            raise CatalogError("unknown major program")
        major_path = year_root / major_id / f"{major_id}.json"
        major = json.loads(major_path.read_text(encoding="utf-8"))
        index = entry["programs"].index(program_id)
        filename = major["specializations"][index]
        source_path = year_root / major_id / filename
        source = source_path.read_text(encoding="utf-8")
        institution = json.loads((year_root / "yale-institution.json").read_text(encoding="utf-8"))
        compiled = pylibmql.compile_program(source, str(source_path), json.dumps(institution))
        ir = json.loads(compiled.json())
        return ProgramAsset(
            catalog_year, major_id, program_id, ir["program_id"], major, source,
            institution, ir,
        )


catalog = MajorCatalog()
