"""Vercel entrypoint for FastAPI backend.

Why this bootstrap exists:
- Vercel can load `/var/task/app.py` as module name `app`.
- A naive `from app.main import app` can resolve incorrectly because this file may
  shadow the `app/` package.
- Loading `app/main.py` without package context breaks relative imports such as
  `from .config import get_settings`.

This implementation makes the current module package-like (`__path__`) and then
loads `app/main.py` specifically as module `app.main`.
"""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys

package_dir = Path(__file__).resolve().parent / "app"
main_file = package_dir / "main.py"

# Make current module behave like package `app`.
__path__ = [str(package_dir)]

spec = spec_from_file_location("app.main", main_file)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Failed to build import spec for {main_file}")

module = module_from_spec(spec)
sys.modules["app.main"] = module
spec.loader.exec_module(module)

app = module.app
