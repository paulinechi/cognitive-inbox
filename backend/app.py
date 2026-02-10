"""Vercel entrypoint.

Vercel loads this file as module name `app` (from `/var/task/app.py`). That shadows
our source folder `app/` unless we make this module package-like.

By assigning `__path__` to the sibling `app/` directory, `import app.main` works and
`app/main.py` keeps its relative imports (e.g. `from .config import ...`).
"""

from importlib import import_module
from pathlib import Path

# Make this module behave like package `app` so `app.main` can be imported.
__path__ = [str(Path(__file__).resolve().parent / "app")]

backend_main = import_module("app.main")
app = backend_main.app
