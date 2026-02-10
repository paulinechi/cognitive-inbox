"""Vercel entrypoint for FastAPI backend.

Some Vercel Python bootstraps execute this file as module name ``app``. In that mode,
plain file-loading ``app/main.py`` can lose package context and break relative imports
inside ``app/main.py`` (e.g. ``from .config import get_settings``).

This bootstrap guarantees package context by:
1) registering this module as package ``app`` (via ``__path__``), and
2) loading ``app/main.py`` under module name ``app.main``.
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
