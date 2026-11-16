"""One-time local XAMPP setup for EcoRewards.

No downloads, no antivirus changes, no remote database access.
Uses local MySQL/MariaDB administrator only to provision a restricted app user.
Never stores the administrator's password. Safe to rerun.
"""
import getpass
import os
import secrets
import string
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'backend'))

try:
    import pymysql
except ImportError:
    print('Missing PyMySQL. Install reviewed dependencies first:')
    print(r'  py -m pip install -r backend\requirements.txt')
    raise SystemExit(1)

from mysql_database import connect, init_schema, load_settings

DBNAME = 'ecorewards'
DBUSER = 'ecorewards_app'
DBHOST = '127.0.0.1'
DBPORT = 3306
ENV = ROOT / 'backend' / '.env'


def password():
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(36))


def existing_connection_works():
    try:
        with connect() as db:
            db.execute('SELECT 1')
        return True
    except Exception:
        return False


def local_admin_connection(admin_pw):
    return pymysql.connect(host=DBHOST, port=DBPORT, user='root',
                           password=admin_pw, charset='utf8mb4',
                           connect_timeout=5, autocommit=False)


def setup_user(raw, new_password):
    # Fixed SQL identifier/user, never interpolate user input in SQL identifiers.
    with raw.cursor() as cur:
        cur.execute('CREATE DATABASE IF NOT EXISTS `ecorewards` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        cur.execute("CREATE USER IF NOT EXISTS 'ecorewards_app'@'localhost' IDENTIFIED BY %s", (new_password,))
        # Re-running reset only the dedicated EcoRewards account, never root.
        cur.execute("ALTER USER 'ecorewards_app'@'localhost' IDENTIFIED BY %s", (new_password,))
        cur.execute("GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON `ecorewards`.* TO 'ecorewards_app'@'localhost'")
    raw.commit()


def save_app_settings(new_password):
    old = load_settings()
    secret = old.get('ECOREWARDS_SECRET')
    if not secret or secret.startswith('CHANGE_') or secret == 'LOCAL_ONLY_SET_SECRET_IN_ENV':
        secret = secrets.token_urlsafe(48)
    content = ('# EcoRewards local database settings: do not share or commit this file.\n'
               'DB_HOST=127.0.0.1\n'
               'DB_PORT=3306\n'
               'DB_NAME=ecorewards\n'
               'DB_USER=ecorewards_app\n'
               f'DB_PASSWORD={new_password}\n'
               f'ECOREWARDS_SECRET={secret}\n')
    temp = ENV.with_name('.env.new')
    temp.write_text(content, encoding='utf-8')
    os.replace(temp, ENV)


def main():
    print('\nEcoRewards local XAMPP setup')
    print('No database tables or saved reports will be deleted.\n')
    if existing_connection_works():
        print('[OK] EcoRewards MySQL connection is already working.')
    else:
        print('Configuring your local database account...')
        try:
            raw = local_admin_connection('')  # Default XAMPP Windows often uses no root password.
        except pymysql.OperationalError as exc:
            if exc.args and exc.args[0] in (2002, 2003):
                print('[ERROR] XAMPP MySQL is not running. Open XAMPP Control Panel and press Start for MySQL.')
                return 1
            print('XAMPP root has a password or this account has different settings.')
            if not sys.stdin.isatty():
                print('Run setup in a terminal to enter the database administrator password.')
                return 1
            pw = getpass.getpass('Local MySQL root password (not saved): ')
            try:
                raw = local_admin_connection(pw)
            except pymysql.MySQLError as exc2:
                print('[ERROR] MySQL administrator connection failed:', exc2)
                return 1
        except pymysql.MySQLError as exc:
            print('[ERROR] Cannot connect to XAMPP MySQL:', exc)
            return 1
        try:
            app_pw = password()
            setup_user(raw, app_pw)
        except pymysql.MySQLError as exc:
            print('[ERROR] Could not create EcoRewards database/user:', exc)
            return 1
        finally:
            raw.close()
        save_app_settings(app_pw)
        if not existing_connection_works():
            print('[ERROR] Account created but app cannot connect; check port 3306 and database configuration.')
            return 1
        print('[OK] Database created and private app credentials saved.')
    try:
        init_schema()
    except Exception as exc:
        print('[ERROR] MySQL table setup failed:', exc)
        return 1
    print('[OK] Five MySQL tables are ready.')
    print('Now you can open EcoRewards or its Database Explorer.\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
