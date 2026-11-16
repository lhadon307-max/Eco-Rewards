"""EcoRewards MySQL/MariaDB database adapter and schema.

PURPOSE: Keep app.py simple while changing storage from SQLite to XAMPP.
HOW: Loads backend/.env, opens PyMySQL connection, translates ? placeholders,
     and commits/rolls back related changes together.
SECURITY: Never connect using the XAMPP root account in the application.
"""
import os
from pathlib import Path

try:
    import pymysql
    from pymysql.cursors import DictCursor
    DBIntegrityError = pymysql.IntegrityError
except ImportError:
    pymysql = None
    DBIntegrityError = ValueError

BASE = Path(__file__).resolve().parent


def load_settings():
    """Read local .env values without requiring an additional dependency."""
    settings = {}
    path = BASE / '.env'
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            settings[k.strip()] = v.strip().strip('"').strip("'")
    # Environment variables override local settings for safer future hosting.
    return {k: os.environ.get(k, v) for k, v in settings.items()}


class Row(dict):
    """Access a MySQL result by column name OR numeric column index."""
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)


class Results:
    """Expose SQLite-style fetchone/fetchall plus update/insert metadata."""
    def __init__(self, cur):
        self.lastrowid = cur.lastrowid
        self.rowcount = cur.rowcount
        if cur.description:
            self.rows = [Row(r) for r in cur.fetchall()]
        else:
            self.rows = []
        self.idx = 0

    def fetchone(self):
        if self.idx >= len(self.rows):
            return None
        result = self.rows[self.idx]
        self.idx += 1
        return result

    def fetchall(self):
        rows = self.rows[self.idx:]
        self.idx = len(self.rows)
        return rows


class Connection:
    """Transaction-safe context manager compatible with existing Flask code."""
    def __init__(self, raw):
        self.raw = raw

    def execute(self, sql, params=()):
        # SQL statements in app.py are static, never user-generated.
        # MySQL's PyMySQL driver uses %s instead of SQLite's ? placeholders.
        sql = sql.replace('?', '%s')
        sql = sql.replace('INSERT OR IGNORE', 'INSERT IGNORE')
        sql = sql.replace('COLLATE NOCASE', '')
        with self.raw.cursor() as cursor:
            cursor.execute(sql, tuple(params))
            return Results(cursor)

    def __enter__(self):
        return self

    def __exit__(self, typ, value, traceback):
        try:
            if typ is None:
                self.raw.commit()
            else:
                self.raw.rollback()
        finally:
            self.raw.close()
        return False


def connect():
    """Create a new transaction-bound MySQL connection (not SQLite)."""
    if pymysql is None:
        raise RuntimeError('PyMySQL missing. Run: py -m pip install -r backend\\requirements.txt')
    settings = load_settings()
    try:
        raw = pymysql.connect(
            host=settings.get('DB_HOST', '127.0.0.1'),
            port=int(settings.get('DB_PORT', '3306')),
            user=settings.get('DB_USER', 'ecorewards_app'),
            password=settings.get('DB_PASSWORD', ''),
            database=settings.get('DB_NAME', 'ecorewards'),
            charset='utf8mb4', cursorclass=DictCursor,
            autocommit=False, connect_timeout=7,
        )
    except Exception as exc:
        raise RuntimeError('Unable to connect to XAMPP MySQL/MariaDB. Check MySQL is running, backend/.env and SETUP_DATABASE.sql. Original error: '+str(exc)) from exc
    return Connection(raw)


# Same five logical tables as the SQLite application; MySQL uses AUTO_INCREMENT,
# InnoDB transactions, indexed foreign keys and utf8mb4 text support.
SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(30) NOT NULL DEFAULT 'user'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
    """CREATE TABLE IF NOT EXISTS reports (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(1500) NOT NULL,
        category VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        photo VARCHAR(255), photo_hash VARCHAR(255),
        risk VARCHAR(30) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        task_status VARCHAR(30) NOT NULL DEFAULT 'none',
        assignee_id INT NULL,
        consent_at VARCHAR(40), safety_answers TEXT, unsafe_reason TEXT,
        after_photo VARCHAR(255),
        created_at VARCHAR(40) NOT NULL,
        updated_at VARCHAR(40) NOT NULL,
        referral_status VARCHAR(40) DEFAULT 'none',
        latitude DOUBLE, longitude DOUBLE,
        photo_sha256 VARCHAR(64), photo_dhash VARCHAR(64), photo_crophashes TEXT,
        KEY idx_reports_user (user_id),
        KEY idx_reports_assignee (assignee_id),
        KEY idx_reports_status (status, task_status),
        CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT fk_reports_assignee FOREIGN KEY (assignee_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
    """CREATE TABLE IF NOT EXISTS points (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL, report_id INT NOT NULL,
        reason VARCHAR(100) NOT NULL, amount INT NOT NULL,
        created_at VARCHAR(40) NOT NULL,
        UNIQUE KEY uq_reward_once (user_id, report_id, reason),
        KEY idx_points_report (report_id),
        CONSTRAINT fk_points_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT fk_points_report FOREIGN KEY (report_id) REFERENCES reports(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
    """CREATE TABLE IF NOT EXISTS events (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL, actor_id INT NULL,
        action VARCHAR(100) NOT NULL, detail TEXT,
        created_at VARCHAR(40) NOT NULL,
        KEY idx_events_report (report_id),
        KEY idx_events_actor (actor_id),
        CONSTRAINT fk_events_report FOREIGN KEY (report_id) REFERENCES reports(id),
        CONSTRAINT fk_events_actor FOREIGN KEY (actor_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
    """CREATE TABLE IF NOT EXISTS photo_matches (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL, matched_report_id INT NOT NULL,
        match_type VARCHAR(50) NOT NULL, hash_distance INT NULL,
        explanation TEXT, created_at VARCHAR(40) NOT NULL,
        UNIQUE KEY uq_photo_match (report_id, matched_report_id, match_type),
        KEY idx_matched_report (matched_report_id),
        CONSTRAINT fk_photo_report FOREIGN KEY (report_id) REFERENCES reports(id),
        CONSTRAINT fk_photo_matched_report FOREIGN KEY (matched_report_id) REFERENCES reports(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
]


def init_schema():
    """Create missing MySQL tables; never overwrite existing users/reports."""
    with connect() as con:
        for statement in SCHEMA:
            con.execute(statement)
