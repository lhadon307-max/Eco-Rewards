"""Start EcoRewards locally. No automatic downloads or shell scripts.

PURPOSE: Run the Flask backend, which serves both user and admin pages.
SETUP: First install packages listed in backend/requirements.txt.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
try:
    import flask  # noqa: F401
    from PIL import Image  # noqa: F401
    import pymysql  # noqa: F401
except ImportError:
    print('Required Python packages are missing.')
    print('Run this command yourself, after reviewing requirements.txt:')
    print('  py -m pip install -r backend\\requirements.txt')
    raise SystemExit(1)

print('EcoRewards is starting at http://127.0.0.1:5000')
print('Press Ctrl+C to stop.')
raise SystemExit(subprocess.call([sys.executable, str(ROOT / 'backend' / 'app.py')], cwd=str(ROOT)))
