"""EcoRewards local MySQL database viewer. Uses Python and PyMySQL.
Run from an extracted EcoRewards folder: py VIEW_ECOREWARDS_DATABASE.py
The viewer binds to localhost (127.0.0.1), is read-only, hides password hashes.
"""
import html, urllib.parse, json, sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
from webbrowser import open as browser_open

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT/'backend'))
DB = 'XAMPP MySQL / MariaDB: ecorewards'
from mysql_database import connect
PORT = 8765

def esc(x):
    return html.escape('—' if x is None else str(x), quote=True)

def snapshot():
    """Read (never modify) the real XAMPP database for lecturer demonstration."""
    try:
        with connect() as con:
            tables = [row['TABLE_NAME'] for row in con.execute(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME").fetchall()]
            result = {}
            for name in tables:
                if not name.replace('_','').isalnum(): continue
                fields = [dict(x) for x in con.execute(
                    "SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, COLUMN_KEY AS keytype FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION",(name,)).fetchall()]
                fields = [{**f,'pk':f['keytype']=='PRI'} for f in fields]
                count = con.execute('SELECT COUNT(*) AS n FROM `'+name+'`').fetchone()['n']
                visible = [f['name'] for f in fields if f['name'].lower() not in
                           ('password','safety_answers','photo_sha256','photo_dhash','photo_crophashes')]
                selection = ', '.join('`'+x+'`' for x in visible)
                rows = [dict(r) for r in con.execute('SELECT '+selection+' FROM `'+name+'` LIMIT 25').fetchall()]
                result[name]=(fields,count,visible,rows)
        return tables,result,''
    except Exception as exc:
        return [],{},'Database connection failed. Start XAMPP MySQL and check backend/.env. '+str(exc)

CSS = '''*{box-sizing:border-box}body{font-family:Segoe UI,Arial,sans-serif;background:#f7f8fb;color:#1c2940;margin:0}header{background:#17283c;color:white;padding:24px 5vw}h1{font-size:26px;margin:0 0 8px}header p{margin:0;color:#cbd5e1}main{max-width:1250px;margin:28px auto;padding:0 20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}.stat,.panel{border:1px solid #e1e6ee;background:white;border-radius:14px;padding:18px}.stat strong{font-size:24px;display:block;margin:9px 0}.stat small{color:#5b687b}h2{font-size:20px}.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.tabs a{color:#1c2940;text-decoration:none;border:1px solid #dce3ed;background:white;border-radius:30px;padding:9px 15px}.tabs a:hover{background:#e7f1ff}.panel{margin-top:16px;overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #eef1f5;padding:10px;text-align:left;vertical-align:top}th{background:#f3f6fc;position:sticky;top:0;white-space:nowrap}td{max-width:240px;overflow-wrap:anywhere}.muted{color:#607086}.pill{font-size:12px;background:#eaf3ff;color:#295aa6;border-radius:30px;padding:4px 9px}footer{margin:30px 0;color:#67768c}code{background:#eaf0f7;padding:2px 5px;border-radius:4px}'''

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path=urllib.parse.urlparse(self.path).path
        if path not in ('/','/favicon.ico'):
            self.send_error(404);return
        if path=='/favicon.ico':
            self.send_response(204);self.end_headers();return
        tables,data,error=snapshot()
        cards=''.join(f'<a class="stat" href="#{esc(t)}" style="text-decoration:none;color:inherit"><small>{esc(t)}</small><strong>{data[t][1]}</strong><span class="muted">records</span></a>' for t in tables)
        navigation=''.join(f'<a href="#{esc(t)}">{esc(t)}</a>' for t in tables)
        sections=''
        for t in tables:
            fields,count,visible,rows=data[t]
            schema_rows=''.join(f'<tr><td><code>{esc(f["name"])}</code></td><td>{esc(f["type"])}</td><td>{"Primary key" if f["pk"] else ""}</td></tr>' for f in fields)
            data_header=''.join(f'<th>{esc(k)}</th>' for k in visible)
            data_rows=''.join('<tr>'+''.join(f'<td>{esc(r.get(k))}</td>' for k in visible)+'</tr>' for r in rows)
            if not rows: data_rows=f'<tr><td colspan="{max(1,len(visible))}">No records yet. Add reports or complete tasks through the app.</td></tr>'
            sections+=f'<section class="panel" id="{esc(t)}"><h2>{esc(t)} <span class="pill">{count} records</span></h2><p class="muted">Table structure</p><table><tr><th>Column</th><th>Type</th><th>Role</th></tr>{schema_rows}</table><p class="muted">First 25 saved records (password hashes and full safety answers hidden)</p><div style="overflow:auto"><table><tr>{data_header}</tr>{data_rows}</table></div></section>'
        msg=f'<section class="panel"><h2>Database not found</h2><p>{esc(error)}</p></section>' if error else ''
        document=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EcoRewards | Database Explorer</title><style>{CSS}</style></head><body><header><h1>EcoRewards · Database Explorer</h1><p>Local, read-only MySQL table viewer · no changes to your app data</p></header><main><p class="muted">Database: <code>{esc(DB) if DB else 'Not found'}</code></p><div class="grid">{cards}</div>{msg}<nav class="tabs">{navigation}</nav>{sections}<footer>Refresh the browser after creating a report to see updated records. Display only dummy/demo data during public presentations.</footer></main></body></html>'''
        body=document.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(body)))
        self.send_header('Cache-Control','no-store')
        self.end_headers();self.wfile.write(body)
    def log_message(self,fmt,*args):
        pass

if __name__=='__main__':
    print('EcoRewards Database Explorer (local read-only)')
    print('Database:',DB)
    print(f'Open: http://127.0.0.1:{PORT}')
    print('Press Ctrl+C to stop.')
    server=HTTPServer(('127.0.0.1',PORT),Handler)
    browser_open(f'http://127.0.0.1:{PORT}')
    server.serve_forever()
