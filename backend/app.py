"""Vercel entrypoint.

This module intentionally avoids `from app.main import app` because when this file is
loaded as module `app`, that import can resolve to this file itself and fail with
`'app' is not a package` in Vercel's runtime loader.
"""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

backend_main_path = Path(__file__).resolve().parent / "app" / "main.py"
spec = spec_from_file_location("cognitive_inbox_backend_main", backend_main_path)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Failed to load backend app module from {backend_main_path}")

module = module_from_spec(spec)
spec.loader.exec_module(module)
app = module.app
