"""EcoRewards backend module: advanced features.

Database-backed functions used by the Flask web/admin/mobile workflows.
"""
"""EcoRewards capstone enhancement module: local-first, evidence/audit oriented.
Not a certified safety system or production AI. No council communication without an admin-triggered send.
"""
import csv, io, json, os, re, math, secrets, smtplib, ssl
from datetime import datetime, timedelta, timezone, date
from email.message import EmailMessage
from functools import wraps
from pathlib import Path
from html import escape as html_escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from flask import Blueprint, request, jsonify, session, g, Response, render_template, redirect
from werkzeug.security import generate_password_hash, check_password_hash
from mysql_database import connect

advanced = Blueprint('advanced', __name__)
NOW = lambda: datetime.now(timezone.utc).isoformat(timespec='seconds')

# Suburbs are illustrative grouping categories; exact catchments must be supplied from a verified council GIS dataset.
REGIONS = {
 'CBD / Inner': ['Brisbane City','Fortitude Valley','Spring Hill','South Brisbane','West End','New Farm','Kangaroo Point'],
 'North': ['Chermside','Aspley','Nundah','Kedron','Wavell Heights','Stafford','Geebung'],
 'South': ['Sunnybank','Moorooka','Mount Gravatt','Eight Mile Plains','Annerley','Acacia Ridge'],
 'East / South-East': ['Carindale','Cannon Hill','Wynnum','Manly','Carina','Tingalpa'],
 'West': ['Toowong','Indooroopilly','Kenmore','Taringa','St Lucia','Milton']
}
REGION_NAMES = {s.lower():area for area, suburbs in REGIONS.items() for s in suburbs}
# Approximate suburb-centre coordinates for convenience only; not property-level geocoding.
# Dates, task coordinates and search radii remain determined by actual report GPS values.
CITY_SUBURBS = {
 'Brisbane': {
  'Brisbane City':(-27.4698,153.0251),'South Brisbane':(-27.4745,153.0180),
  'Fortitude Valley':(-27.4565,153.0338),'Spring Hill':(-27.4596,153.0247),
  'West End':(-27.4824,153.0098),'New Farm':(-27.4679,153.0451),
  'Kangaroo Point':(-27.4762,153.0340),'Chermside':(-27.3853,153.0311),
  'Aspley':(-27.3656,153.0169),'Nundah':(-27.4024,153.0612),
  'Kedron':(-27.4054,153.0303),'Stafford':(-27.4096,153.0104),
  'Sunnybank':(-27.5796,153.0572),'Moorooka':(-27.5338,153.0238),
  'Mount Gravatt':(-27.5394,153.0825),'Eight Mile Plains':(-27.5771,153.1001),
  'Annerley':(-27.5128,153.0339),'Acacia Ridge':(-27.5868,153.0254),
  'Carindale':(-27.5050,153.1052),'Cannon Hill':(-27.4724,153.0940),
  'Wynnum':(-27.4440,153.1728),'Manly':(-27.4542,153.1879),
  'Toowong':(-27.4849,152.9914),'Indooroopilly':(-27.5019,152.9734),
  'Kenmore':(-27.5063,152.9390),'Taringa':(-27.4928,152.9788),
  'Milton':(-27.4706,153.0019),'St Lucia':(-27.4975,153.0057)
 },
 'Gold Coast': {
  'Southport':(-27.9674,153.4147),'Surfers Paradise':(-28.0027,153.4290),
  'Broadbeach':(-28.0293,153.4301),'Robina':(-28.0737,153.3932),
  'Burleigh Heads':(-28.0936,153.4495),'Nerang':(-27.9893,153.3365)
 },
 'Ipswich': {
  'Ipswich':(-27.6146,152.7609),'Springfield Central':(-27.6820,152.9055),
  'Goodna':(-27.6139,152.8977),'Redbank Plains':(-27.6465,152.8669)
 }
}

HAZARDS = ('needle','syringe','sharps','asbestos','chemical','solvent','acid','drum','biohazard','broken glass','glass shards','medical waste','hazardous','oil spill','battery leak')
# These are content signal heuristics, NOT an image-trained classifier.
LOW_CATEGORIES = {'general litter','overflowing bins','plastic litter','paper litter'}
SAFETY_SOURCE = {
 'title':'How to manage work health and safety risks — Code of Practice 2021 (Queensland), and Clean Up Australia safety resources',
 'codes':'https://www.worksafe.qld.gov.au/laws-and-compliance/codes-of-practice',
 'cleanup':'https://www.cleanup.org.au/safety/'
}
SAFETY = [
 ('access','I have confirmed that the specific cleanup location may legally be accessed and the activity is permitted.'),
 ('conditions','I have assessed site conditions, including traffic, uneven ground, waterways and weather.'),
 ('ppe','I have suitable PPE for the assessed task and know its limitations.'),
 ('training','I have received relevant instruction/training and understand the permitted scope of this task.'),
 ('hazards','I will not handle suspected sharps, chemicals, asbestos, unknown material or other hazardous waste.'),
 ('firstaid','I know the first-aid and emergency communication arrangements.'),
 ('dispose','I have checked that collected rubbish can be disposed of lawfully.'),
 ('stop','I will stop work, move to safety and escalate any unexpected risk immediately.')
]

ADVANCED_SCHEMA = [
 """CREATE TABLE IF NOT EXISTS cleaner_applications (user_id INT PRIMARY KEY, status VARCHAR(30) NOT NULL DEFAULT 'pending', answers TEXT NOT NULL, equipment TEXT NOT NULL, qualification TEXT, evidence_file VARCHAR(255), review_notes TEXT, reviewed_by INT, reviewed_at VARCHAR(40), expires_at VARCHAR(40), created_at VARCHAR(40), INDEX idx_cleaner_status(status)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
 """CREATE TABLE IF NOT EXISTS notification_settings (user_id INT PRIMARY KEY, enabled TINYINT NOT NULL DEFAULT 0, radius_km DOUBLE NOT NULL DEFAULT 5, latitude DOUBLE NULL, longitude DOUBLE NULL, updated_at VARCHAR(40) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
 """CREATE TABLE IF NOT EXISTS notifications (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,report_id INT NULL,kind VARCHAR(40) NOT NULL,title VARCHAR(255) NOT NULL,body TEXT NOT NULL,seen TINYINT NOT NULL DEFAULT 0,created_at VARCHAR(40) NOT NULL, UNIQUE KEY uq_notice (user_id, report_id, kind)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
 """CREATE TABLE IF NOT EXISTS authority_recipients (id INT AUTO_INCREMENT PRIMARY KEY, label VARCHAR(120) NOT NULL, email VARCHAR(250) NOT NULL, region VARCHAR(100) DEFAULT '', active TINYINT DEFAULT 0, verified TINYINT DEFAULT 0, created_at VARCHAR(40)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
 """CREATE TABLE IF NOT EXISTS authority_dispatches (id INT AUTO_INCREMENT PRIMARY KEY, recipient_id INT NULL, recipient_email VARCHAR(250) NOT NULL, region VARCHAR(100), suburb VARCHAR(150), period VARCHAR(30), report_count INT NOT NULL, status VARCHAR(30) NOT NULL, error TEXT, csv_content MEDIUMTEXT, created_at VARCHAR(40) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
 """CREATE TABLE IF NOT EXISTS ai_assessments (id INT AUTO_INCREMENT PRIMARY KEY, report_id INT NOT NULL, result VARCHAR(50) NOT NULL, reasons TEXT, method VARCHAR(60) NOT NULL, created_at VARCHAR(40) NOT NULL, INDEX idx_ai_report(report_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
 """CREATE TABLE IF NOT EXISTS authority_pdf_reports (id INT AUTO_INCREMENT PRIMARY KEY, generated_by INT NOT NULL, date_from DATE NOT NULL, date_to DATE NOT NULL, region VARCHAR(100), suburb VARCHAR(150), category VARCHAR(200), report_count INT NOT NULL, file_name VARCHAR(200) NOT NULL, pdf_bytes LONGBLOB NOT NULL, created_at VARCHAR(40) NOT NULL, INDEX idx_pdf_owner(generated_by)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
 """CREATE TABLE IF NOT EXISTS authority_pdf_sends (id INT AUTO_INCREMENT PRIMARY KEY, pdf_id INT NOT NULL, recipient_email VARCHAR(250) NOT NULL, status VARCHAR(25) NOT NULL, error TEXT, created_at VARCHAR(40) NOT NULL, INDEX idx_sent_pdf(pdf_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
 """CREATE TABLE IF NOT EXISTS profile_settings (user_id INT PRIMARY KEY, phone VARCHAR(50) DEFAULT '', bio VARCHAR(500) DEFAULT '', updated_at VARCHAR(40) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"""
]

def init_advanced():
    """Create or migrate tables for extended EcoRewards workflows."""
    with connect() as db:
        for sql in ADVANCED_SCHEMA: db.execute(sql)
        for field in ('city','suburb'):
            try: db.execute(f"ALTER TABLE notification_settings ADD COLUMN {field} VARCHAR(120) NULL")
            except Exception as exc:
                if 'Duplicate column' not in str(exc) and '1060' not in str(exc): raise


def actor_uid():
    """Identify the requesting account for advanced routes."""
    return getattr(g, 'mobile_uid', None) or session.get('uid')


def logged(admin=False):
    """Enforce authentication on an advanced route."""
    def deco(fn):
        @wraps(fn)
        def guarded(*args,**kwargs):
            uid=actor_uid()
            if not uid: return jsonify(error='Login required'),401
            if admin:
                with connect() as db: user=db.execute('SELECT role FROM users WHERE id=?',(uid,)).fetchone()
                if not user or user['role']!='admin': return jsonify(error='Admin access required'),403
            return fn(*args,**kwargs)
        return guarded
    return deco

@advanced.get('/api/advanced/location-options')
@logged()
def location_options():
    """List supported cities and suburbs."""
    return jsonify(cities={k:sorted(v) for k,v in CITY_SUBURBS.items()},
                   description='Suburb centres are approximate; distance is straight-line from the selected suburb centre.')

@advanced.post('/api/advanced/location-resolve')
@logged()
def location_resolve():
    """Resolve a selected city/suburb to approximate search coordinates."""
    data=request.get_json(silent=True) or {}
    city=str(data.get('city','')).strip(); suburb=str(data.get('suburb','')).strip()
    coordinate=CITY_SUBURBS.get(city,{}).get(suburb)
    if not coordinate:return jsonify(error='Select a listed city and suburb.'),400
    return jsonify(city=city,suburb=suburb,latitude=coordinate[0],longitude=coordinate[1],label=f'{suburb}, {city}',approximate=True)


def region_for(location):
    """Group a suburb into a Brisbane dashboard region."""
    s=(location or '').lower()
    candidates=sorted(REGION_NAMES, key=len, reverse=True)
    for name in candidates:
        if re.search(r'(?<![a-z])'+re.escape(name)+r'(?![a-z])',s): return REGION_NAMES[name],name.title()
    return 'Unmapped','Unknown'

def months(n=6):
    """Generate the monthly labels for trend summaries."""
    today=datetime.now(timezone.utc).date()
    y,m=today.year,today.month
    series=[]
    for i in range(n-1,-1,-1):
        off=(y*12+m-1)-i
        yy,mm=divmod(off,12)
        series.append(f'{yy:04d}-{mm+1:02d}')
    return series

def report_scope(args):
    """Apply filters to scoped report queries."""
    region=args.get('region','All');suburb=args.get('suburb','All')
    with connect() as db: reports=[dict(x) for x in db.execute('SELECT id,title,category,description,location,status,task_status,risk,latitude,longitude,created_at,updated_at,referral_status FROM reports ORDER BY id DESC').fetchall()]
    for r in reports: r['region'],r['suburb']=region_for(r['location'])
    if region!='All': reports=[r for r in reports if r['region']==region]
    if suburb!='All': reports=[r for r in reports if r['suburb'].lower()==suburb.lower()]
    return reports

@advanced.get('/admin/intelligence')
@logged(admin=True)
def intelligence_page():return render_template('intelligence.html')

@advanced.get('/api/advanced/regions')
@logged(admin=True)
def regions():return jsonify(regions=REGIONS,source_note='Illustrative region mapping; validate against official council suburb boundaries.')

@advanced.get('/api/advanced/analytics')
@logged(admin=True)
def analytics():
    """Return environmental dashboard aggregates and trend metrics."""
    data=report_scope(request.args)
    labels=months()
    chart=[]
    for label in labels:
        sub=[r for r in data if (r['created_at'] or '')[:7]==label]
        chart.append({'month':label,'reports':len(sub),'dumping':sum('dump' in r['category'].lower() for r in sub),
                      'completed':sum(r['task_status']=='completed' for r in sub),'review':sum(r['status'] in ('pending','flagged') for r in sub)})
    current,prior=chart[-1]['reports'],chart[-2]['reports']
    change=None if not prior else round(100*(current-prior)/prior,1)
    return jsonify(total=len(data),completed=sum(r['task_status']=='completed' for r in data),
       pending=sum(r['status'] in ('pending','flagged') for r in data),dumping=sum('dump' in r['category'].lower() for r in data),
       hazardous=sum(r['risk']=='high' for r in data),referred=sum(r['status']=='referred' for r in data),
       monthly=chart,monthly_change_percent=change, categories={k:sum(r['category']==k for r in data) for k in sorted(set(r['category'] for r in data))},
       reports=data[:500],trend_note='Counts reflect report creation; increased reports do not necessarily mean increased pollution. Historical completion rates require status-event timestamps.')

@advanced.get('/api/advanced/safety')
def safety():return jsonify(source=SAFETY_SOURCE,questions=[{'id':k,'text':v} for k,v in SAFETY],status='Adapted draft, not legally certified; requires WHS review before real cleanup')

@advanced.get('/api/advanced/my-profile')
@logged()
def my_profile():
    """Return the requesting user or cleaner profile."""
    with connect() as db:
        u=db.execute('SELECT id,name,email,role FROM users WHERE id=?',(actor_uid(),)).fetchone()
        p=db.execute('SELECT phone,bio FROM profile_settings WHERE user_id=?',(actor_uid(),)).fetchone()
        c=db.execute('SELECT status,qualification,created_at,review_notes,expires_at FROM cleaner_applications WHERE user_id=?',(actor_uid(),)).fetchone()
        n=db.execute('SELECT enabled,radius_km,latitude,longitude,city,suburb FROM notification_settings WHERE user_id=?',(actor_uid(),)).fetchone()
    return jsonify(user=dict(u),profile=dict(p) if p else {},cleaner=dict(c) if c else None,notifications=dict(n) if n else {})

# Recognition is based only on administrator-confirmed completed cleanups.
# It never grants access to higher-risk work or replaces safety verification.
def cleaner_recognition(completions):
    """Calculate recognition levels from verified completed tasks."""
    count = max(0, int(completions))
    levels = ((100, 'Eco Legend', '🏆'), (50, 'Community Champion', '🌟'), (10, 'Eco Explorer', '🌱'))
    minimum, title, symbol = next(((n, label, icon) for n,label,icon in levels if count >= n), (0, 'EcoCleaner', '✨'))
    next_target = next((n for n in (10, 50, 100) if n > count), None)
    return {'count': count, 'title': title, 'icon': symbol, 'threshold': minimum,
            'next_target': next_target, 'remaining': (next_target-count if next_target else 0),
            'progress_percent': (min(100, round(100*count/next_target)) if next_target else 100),
            'levels': [{'threshold': n, 'title': label, 'icon': icon, 'unlocked': count>=n}
                       for n,label,icon in ((10,'Eco Explorer','🌱'),(50,'Community Champion','🌟'),(100,'Eco Legend','🏆'))]}

@advanced.get('/api/advanced/cleaner/recognition')
@logged()
def cleaner_recognition_api():
    """Expose cleaner recognition information to the mobile app."""
    with connect() as db:
        row=db.execute("SELECT COUNT(*) AS total FROM reports WHERE assignee_id=? AND status='resolved' AND task_status='completed'", (actor_uid(),)).fetchone()
        verification=db.execute('SELECT status,expires_at FROM cleaner_applications WHERE user_id=?',(actor_uid(),)).fetchone()
    record=cleaner_recognition(row['total'] if row else 0)
    record['verified']=bool(verification and verification['status']=='approved' and (not verification['expires_at'] or verification['expires_at']>NOW()))
    record['note']='Recognition badges reflect verified completed tasks; they do not certify safety competence.'
    return jsonify(record)

@advanced.post('/api/advanced/my-profile')
@logged()
def update_profile():
    """Update permitted profile fields."""
    d=request.get_json(silent=True) or {}
    name=str(d.get('name','')).strip();phone=str(d.get('phone','')).strip();bio=str(d.get('bio','')).strip()
    if not 2<=len(name)<=100 or len(phone)>50 or len(bio)>500:return jsonify(error='Invalid profile fields'),400
    with connect() as db:
        db.execute('UPDATE users SET name=? WHERE id=?',(name,actor_uid()))
        db.execute('INSERT INTO profile_settings(user_id,phone,bio,updated_at) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE phone=VALUES(phone),bio=VALUES(bio),updated_at=VALUES(updated_at)',(actor_uid(),phone,bio,NOW()))
    return jsonify(ok=True)

@advanced.post('/api/advanced/cleaner/apply')
@logged()
def cleaner_apply():
    """Accept safety declarations and cleaner-application evidence."""
    d=request.get_json(silent=True) or {}
    answers=d.get('answers',{});equipment=d.get('equipment',{})
    if not isinstance(answers,dict) or any(answers.get(k) is not True for k,_ in SAFETY):return jsonify(error='Complete all WHS-aligned declarations'),400
    # Photos are evidence in a real process; this prototype accepts secure references to uploaded equipment images.
    if not isinstance(equipment,dict) or not all(isinstance(equipment.get(k),str) and re.fullmatch(rf'{actor_uid()}_[a-f0-9]{{32}}\.jpg',equipment[k]) for k in ('gloves','footwear','grabber','bags')):
        return jsonify(error='Equipment evidence references are required for gloves, footwear, grabber and bags'),400
    qualification=str(d.get('qualification',''))[:200]
    with connect() as db:
        existing=db.execute('SELECT status FROM cleaner_applications WHERE user_id=?',(actor_uid(),)).fetchone()
        if existing and existing['status']=='approved':return jsonify(error='Already verified. Contact administrator for changes.'),409
        db.execute("INSERT INTO cleaner_applications(user_id,status,answers,equipment,qualification,created_at) VALUES(?,'pending',?,?,?,?) ON DUPLICATE KEY UPDATE status='pending',answers=VALUES(answers),equipment=VALUES(equipment),qualification=VALUES(qualification),created_at=VALUES(created_at)",(actor_uid(),json.dumps(answers),json.dumps(equipment),qualification,NOW()))
    return jsonify(ok=True,status='pending',note='Self-declaration does not establish official certification; admin must assess real evidence.')

@advanced.get('/api/advanced/admin/cleaners')
@logged(admin=True)
def cleaner_queue():
    """List cleaner applications awaiting administrator review."""
    with connect() as db: data=[dict(x) for x in db.execute('SELECT c.*,u.name,u.email FROM cleaner_applications c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC').fetchall()]
    return jsonify(applications=data)

@advanced.post('/api/advanced/admin/cleaners/<int:uid>')
@logged(admin=True)
def verify_cleaner(uid):
    """Approve, reject or suspend a cleaner within admin scope."""
    d=request.get_json(silent=True) or {}; action=d.get('action')
    if action not in ('approved','rejected','suspended','more_evidence'):return jsonify(error='Invalid decision'),400
    notes=str(d.get('notes',''))[:800]
    with connect() as db:
        previous=db.execute('SELECT user_id FROM cleaner_applications WHERE user_id=?',(uid,)).fetchone()
        if not previous:return jsonify(error='Application not found'),404
        db.execute('UPDATE cleaner_applications SET status=?,review_notes=?,reviewed_by=?,reviewed_at=?,expires_at=? WHERE user_id=?',
                   (action,notes,actor_uid(),NOW(),(datetime.now(timezone.utc)+timedelta(days=180)).isoformat() if action=='approved' else None,uid))
    return jsonify(ok=True,status=action)

@advanced.post('/api/advanced/notifications/preferences')
@logged()
def save_notify():
    """Store notification location and radius preferences."""
    d=request.get_json(silent=True) or {}
    try:
        enabled=1 if d.get('enabled') is True else 0
        radius=float(d.get('radius_km',5))
        if radius not in (2,5,10): raise ValueError('Distance must be 2, 5, or 10 km.')
        city=str(d.get('city','')).strip();suburb=str(d.get('suburb','')).strip()
        coords=CITY_SUBURBS.get(city,{}).get(suburb)
        # Named location is intentionally required for opt-in alerts.
        if enabled and not coords: raise ValueError('Choose a city and suburb to enable nearby alerts.')
        lat,lon=coords if coords else (None,None)
    except (ValueError,TypeError) as exc:return jsonify(error=str(exc) or 'Invalid alert preferences.'),400
    with connect() as db:
        db.execute("""INSERT INTO notification_settings(user_id,enabled,radius_km,latitude,longitude,city,suburb,updated_at)
                      VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),radius_km=VALUES(radius_km),latitude=VALUES(latitude),longitude=VALUES(longitude),city=VALUES(city),suburb=VALUES(suburb),updated_at=VALUES(updated_at)""",
                   (actor_uid(),enabled,radius,lat,lon,city or None,suburb or None,NOW()))
    return jsonify(ok=True,note='Preferences saved. Alerts are shown in this app; phone push notifications are not enabled.')


def distance(lat1,lon1,lat2,lon2):
    """Compute approximate distance for nearby-alert matching."""
    a,b,c,d=map(math.radians,(lat1,lon1,lat2,lon2))
    v=math.sin((c-a)/2)**2+math.cos(a)*math.cos(c)*math.sin((d-b)/2)**2
    return 6371*2*math.atan2(math.sqrt(v),math.sqrt(max(0,1-v)))

def notify_nearby(db, report_id, title, lat,lon):
    """Create notifications for cleaners near a published task."""
    if lat is None or lon is None:return 0
    users=db.execute("""SELECT n.user_id,n.latitude,n.longitude,n.radius_km FROM notification_settings n JOIN cleaner_applications c ON c.user_id=n.user_id WHERE n.enabled=1 AND c.status='approved' AND (c.expires_at IS NULL OR c.expires_at>?)""",(NOW(),)).fetchall()
    sent=0
    for u in users:
        if u['latitude'] is None or u['longitude'] is None:continue
        if distance(lat,lon,u['latitude'],u['longitude'])<=u['radius_km']:
            db.execute("INSERT IGNORE INTO notifications(user_id,report_id,kind,title,body,created_at) VALUES(?,?,'task_available',?,?,?)",
                       (u['user_id'],report_id,'New EcoTask nearby',f'{title} is available within your chosen distance.',NOW()))
            sent+=1
    return sent

@advanced.get('/api/advanced/notifications')
@logged()
def get_notices():
    """List account notifications."""
    with connect() as db:
        notices=[dict(x) for x in db.execute('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100',(actor_uid(),)).fetchall()]
    return jsonify(notifications=notices)

@advanced.post('/api/advanced/notifications/<int:nid>/read')
@logged()
def notice_read(nid):
    """Mark a notification as read."""
    with connect() as db:db.execute('UPDATE notifications SET seen=1 WHERE id=? AND user_id=?',(nid,actor_uid()))
    return jsonify(ok=True)

def screening(category,description,duplicate=False):
    """Perform preliminary image/risk screening; never guarantee site safety."""
    text=(category+' '+description).lower()
    hits=[k for k in HAZARDS if k in text]
    if hits:return 'hazard_hold',['Hazard signals in supplied category/description: '+', '.join(hits)]
    if duplicate:return 'duplicate_review',['Potential image/location duplicate — do not automatically award points or merge without review']
    if category.strip().lower() in LOW_CATEGORIES:return 'low_risk_candidate',['Category eligible for additional site-permission and risk controls; image content not visually classified']
    return 'manual_review',['Unsupported/unknown category — manual classification needed']

@advanced.get('/api/advanced/admin/ai/<int:rid>')
@logged(admin=True)
def ai_history(rid):
    """Return screening evidence and audit history."""
    with connect() as db:rows=[dict(x) for x in db.execute('SELECT * FROM ai_assessments WHERE report_id=? ORDER BY id DESC',(rid,)).fetchall()]
    return jsonify(history=rows)

@advanced.get('/api/advanced/admin/recipients')
@logged(admin=True)
def recipients():
    """List configured authority-report destinations."""
    with connect() as db:rs=[dict(x) for x in db.execute('SELECT * FROM authority_recipients ORDER BY id DESC').fetchall()]
    return jsonify(recipients=rs)

@advanced.post('/api/advanced/admin/recipients')
@logged(admin=True)
def save_recipient():
    """Save an authority recipient subject to authorisation."""
    d=request.get_json(silent=True) or {};label=str(d.get('label',''))[:120];email=str(d.get('email','')).strip()[:250];region=str(d.get('region','All'))[:100]
    if not label or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):return jsonify(error='Valid label/email required'),400
    with connect() as db:
        rs=db.execute('INSERT INTO authority_recipients(label,email,region,active,verified,created_at) VALUES(?,?,?,0,0,?)',(label,email,region,NOW()))
    return jsonify(ok=True,id=rs.lastrowid,note='New recipients are disabled by default; independently confirm official address and permission before enabling.')

@advanced.post('/api/advanced/admin/recipients/<int:rid>')
@logged(admin=True)
def recipient_status(rid):
    """Show authority email configuration and delivery status."""
    d=request.get_json(silent=True) or {};active=1 if d.get('active') is True else 0
    if active and d.get('verified') is not True:return jsonify(error='Confirm permission and independently verified official address'),400
    with connect() as db:db.execute('UPDATE authority_recipients SET active=?,verified=? WHERE id=?',(active,1 if active else 0,rid))
    return jsonify(ok=True)

def csv_for(reports):
    """Build a filtered export dataset."""
    output=io.StringIO(); writer=csv.writer(output)
    writer.writerow(['Report ID','Title','Category','Suburb','Region','Risk','Status','Task status','Created UTC','Referral status'])
    for r in reports:writer.writerow([r[x] for x in ('id','title','category','suburb','region','risk','status','task_status','created_at','referral_status')])
    return output.getvalue()

@advanced.get('/api/advanced/admin/export.csv')
@logged(admin=True)
def csv_export():
    """Return a downloadable CSV export."""
    data=csv_for(report_scope(request.args))
    return Response(data,mimetype='text/csv',headers={'Content-Disposition':'attachment; filename=ecorewards_authority_report.csv','Cache-Control':'no-store'})

@advanced.post('/api/advanced/admin/dispatch')
@logged(admin=True)
def dispatch():
    """Prepare or send an authority report using configured email."""
    d=request.get_json(silent=True) or {}; rid=d.get('recipient_id');region=str(d.get('region','All'));suburb=str(d.get('suburb','All'));period=str(d.get('period','weekly'))
    if period not in ('daily','weekly','all'):return jsonify(error='Invalid period'),400
    try:rid=int(rid)
    except (ValueError,TypeError):return jsonify(error='Select a configured recipient'),400
    reports=report_scope({'region':region,'suburb':suburb})
    if period!='all':
        cutoff=(datetime.now(timezone.utc)-timedelta(days=1 if period=='daily' else 7)).isoformat()[:10]
        reports=[r for r in reports if str(r['created_at'])[:10]>=cutoff]
    csv_text=csv_for(reports)
    with connect() as db:recipient=db.execute('SELECT * FROM authority_recipients WHERE id=?',(rid,)).fetchone()
    if not recipient:return jsonify(error='Unknown recipient'),404
    # Safe default: draft/preview only. Actual delivery requires explicit send and verified recipient.
    send=d.get('send') is True
    status='draft';err=''
    if send:
        if not recipient['active'] or not recipient['verified']:return jsonify(error='Recipient not approved for dispatch'),403
        settings={k:os.environ.get(k,'') for k in ('SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','SMTP_FROM')}
        if not settings['SMTP_HOST'] or not settings['SMTP_FROM']:return jsonify(error='SMTP not configured. Draft is available without sending.'),503
        try:
            msg=EmailMessage();msg['Subject']=f'EcoRewards {period} report — {region} / {suburb}';msg['From']=settings['SMTP_FROM'];msg['To']=recipient['email']
            msg.set_content(f'EcoRewards report export. {len(reports)} reports. Data is for the agreed authorized purpose only.');msg.add_attachment(csv_text.encode('utf-8'),maintype='text',subtype='csv',filename='ecorewards_reports.csv')
            with smtplib.SMTP(settings['SMTP_HOST'],int(settings['SMTP_PORT'] or '587'),timeout=15) as server:
                server.starttls(context=ssl.create_default_context())
                if settings['SMTP_USER']:server.login(settings['SMTP_USER'],settings['SMTP_PASSWORD'])
                server.send_message(msg)
            status='sent' # SMTP accepted, not authority acknowledgement
        except Exception as exc:status='failed';err=str(exc)[:400]
    with connect() as db:
        cur=db.execute('INSERT INTO authority_dispatches(recipient_id,recipient_email,region,suburb,period,report_count,status,error,csv_content,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',(rid,recipient['email'],region,suburb,period,len(reports),status,err,csv_text,NOW()))
    return jsonify(ok=status!='failed',status=status,count=len(reports),dispatch_id=cur.lastrowid,error=err,meaning='sent means SMTP accepted, not authority acknowledged')

@advanced.get('/api/advanced/admin/dispatches')
@logged(admin=True)
def dispatches():
    """List saved authority email dispatch history."""
    with connect() as db:items=[dict(x) for x in db.execute('SELECT id,recipient_email,region,suburb,period,report_count,status,error,created_at FROM authority_dispatches ORDER BY id DESC LIMIT 100').fetchall()]
    return jsonify(dispatches=items)

@advanced.get('/api/advanced/admin/dispatches/<int:did>.csv')
@logged(admin=True)
def historical_dispatch(did):
    """Fetch a historical authority dispatch record."""
    with connect() as db:r=db.execute('SELECT csv_content FROM authority_dispatches WHERE id=?',(did,)).fetchone()
    if not r:return jsonify(error='Not found'),404
    return Response(r['csv_content'],mimetype='text/csv',headers={'Content-Disposition':f'attachment; filename=dispatch_{did}.csv','Cache-Control':'no-store'})


# ----- Authority PDF workflow: chosen date range -> fixed snapshot -> download -> explicit send -----
def validate_pdf_scope(values):
    """Validate date ranges and filters for an authority PDF."""
    try:
        start=date.fromisoformat(str(values.get('date_from','')))
        end=date.fromisoformat(str(values.get('date_to','')))
    except (ValueError,TypeError): raise ValueError('Select valid start and end dates (YYYY-MM-DD).')
    if start>end: raise ValueError('Start date must be on or before end date.')
    if (end-start).days>730: raise ValueError('Choose a date range of two years or less.')
    if end>datetime.now(timezone.utc).date():raise ValueError('End date cannot be in the future.')
    region=str(values.get('region','All'))[:100]
    suburb=str(values.get('suburb','All'))[:150]
    category=str(values.get('category','All'))[:200]
    if region!='All' and region not in REGIONS: raise ValueError('Choose a valid region.')
    if suburb!='All' and region!='All' and suburb not in REGIONS[region]: raise ValueError('Choose a suburb within the selected region.')
    return start,end,region,suburb,category

def scoped_pdf_reports(start,end,region,suburb,category):
    """Fetch reports matching the PDF export criteria."""
    rows=report_scope({'region':region,'suburb':suburb})
    return [r for r in rows if start.isoformat()<=str(r.get('created_at') or '')[:10]<=end.isoformat() and (category=='All' or r['category']==category)]

def build_authority_pdf(rows,start,end,region,suburb,category):
    """Creates a privacy-minimised, printable report from a fixed report snapshot."""
    buf=io.BytesIO();doc=SimpleDocTemplate(buf,pagesize=A4,rightMargin=17*mm,leftMargin=17*mm,topMargin=20*mm,bottomMargin=18*mm)
    styles=getSampleStyleSheet()
    styles.add(ParagraphStyle(name='EcoTitle',fontName='Helvetica-Bold',fontSize=22,leading=27,textColor=colors.HexColor('#172944'),spaceAfter=6))
    styles.add(ParagraphStyle(name='EcoSmall',fontName='Helvetica',fontSize=8.5,leading=12,textColor=colors.HexColor('#58677a')))
    styles.add(ParagraphStyle(name='EcoLabel',fontName='Helvetica-Bold',fontSize=10.5,leading=14,textColor=colors.HexColor('#233753'),spaceBefore=17,spaceAfter=7))
    styles.add(ParagraphStyle(name='EcoCell',fontName='Helvetica',fontSize=7,leading=10,textColor=colors.HexColor('#2d394b')))
    P=lambda x,style='EcoCell':Paragraph(html_escape(str(x or '—')),styles[style])
    total=len(rows);complete=sum(str(r['task_status']).lower() in ('completed','resolved') for r in rows); pending=sum(str(r['status']).lower() in ('pending','flagged','review','needs review') for r in rows);dumping=sum('dump' in str(r['category']).lower() for r in rows);high=sum(str(r['risk']).lower()=='high' for r in rows)
    story=[P('EcoRewards','EcoTitle'),P('Environmental report • Authority briefing','EcoSmall'),Spacer(1,8*mm),P(f'Reporting period: {start:%d %b %Y} to {end:%d %b %Y}','EcoLabel'),P(f'Area: {region} / {suburb}   |   Category: {category}','EcoSmall'),P('Summary','EcoLabel')]
    metrics=[[P('Reports'),P('Completed tasks'),P('Under review'),P('Dumping'),P('High risk')],[P(str(n)) for n in (total,complete,pending,dumping,high)]]
    t=Table(metrics,colWidths=[35*mm]*5,rowHeights=[12*mm,14*mm]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#edf4f8')),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#cddce7')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),9)]));story.append(t)
    cats={}
    for r in rows:cats[r['category']]=cats.get(r['category'],0)+1
    story +=[P('Categories','EcoLabel'),P('; '.join(f'{k}: {v}' for k,v in sorted(cats.items(),key=lambda x:-x[1])) or 'No reports in this period.','EcoSmall'),P('Report records (personal details excluded)','EcoLabel')]
    headings=['ID','Date','Category','Suburb','Risk','Status']
    data=[[P(h) for h in headings]]
    for r in rows[:1200]:
        data.append([P(str(r['id'])),P(str(r['created_at'])[:10]),P(str(r['category'])[:32]),P(str(r['suburb'])[:25]),P(str(r['risk'])[:14]),P(str(r['status'])[:22])])
    tab=Table(data,colWidths=[13*mm,25*mm,51*mm,37*mm,20*mm,29*mm],repeatRows=1,hAlign='LEFT')
    tab.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#dceaf2')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f5f8fa')]),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,0),.7,colors.HexColor('#b9cbd8'))]));story.append(tab)
    if total>1200:story.append(P('Only the first 1,200 records are listed; summary includes all records.','EcoSmall'))
    story += [Spacer(1,8*mm),P('Data and privacy notes','EcoLabel'),P('Counts reflect the selected report creation dates and current task statuses. A rise in reporting does not establish a rise in environmental pollution. This PDF does not include personal contact details, raw GPS coordinates or photographs.','EcoSmall'),Spacer(1,4*mm),P('Generated by EcoRewards • This export does not constitute formal council acknowledgement.','EcoSmall')]
    def footer(canv,document):
        canv.setFont('Helvetica',8);canv.setFillColor(colors.HexColor('#718195'));canv.drawString(17*mm,12*mm,'EcoRewards · Environmental intelligence');canv.drawRightString(192*mm,12*mm,f'Page {document.page}')
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    return buf.getvalue()

@advanced.post('/api/advanced/admin/pdf-reports')
@logged(admin=True)
def create_pdf_report():
    """Create and store a new filtered PDF report."""
    data=request.get_json(silent=True) or {}
    try:start,end,region,suburb,category=validate_pdf_scope(data)
    except ValueError as ex:return jsonify(error=str(ex)),400
    rows=scoped_pdf_reports(start,end,region,suburb,category)
    if len(rows)>5000:return jsonify(error='Too many records. Reduce your date range or select an area.'),400
    payload=build_authority_pdf(rows,start,end,region,suburb,category)
    filename=f'EcoRewards_Report_{start.isoformat()}_to_{end.isoformat()}.pdf'
    with connect() as db:
        result=db.execute('INSERT INTO authority_pdf_reports(generated_by,date_from,date_to,region,suburb,category,report_count,file_name,pdf_bytes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',(actor_uid(),start.isoformat(),end.isoformat(),region,suburb,category,len(rows),filename,payload,NOW()))
    return jsonify(id=result.lastrowid,report_count=len(rows),filename=filename,download_url=f'/api/advanced/admin/pdf-reports/{result.lastrowid}.pdf',date_from=start.isoformat(),date_to=end.isoformat())

@advanced.get('/api/advanced/admin/pdf-reports/<int:pid>.pdf')
@logged(admin=True)
def download_pdf_report(pid):
    """Serve a previously generated PDF report."""
    with connect() as db:r=db.execute('SELECT file_name,pdf_bytes FROM authority_pdf_reports WHERE id=?',(pid,)).fetchone()
    if not r:return jsonify(error='Report not found'),404
    return Response(bytes(r['pdf_bytes']),mimetype='application/pdf',headers={'Content-Disposition':f'{"inline" if request.args.get("preview") == "1" else "attachment"}; filename="{r["file_name"]}"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'})

@advanced.post('/api/advanced/admin/pdf-reports/<int:pid>/send')
@logged(admin=True)
def send_pdf_report(pid):
    """Email an existing PDF with delivery logging."""
    values=request.get_json(silent=True) or {}
    email=str(values.get('email','')).strip()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[A-Za-z]{2,}',email) or len(email)>250:
        return jsonify(error='Enter a valid recipient email address.'),400
    if values.get('permission_confirmed') is not True:return jsonify(error='Confirm recipient address and permission to share this report.'),400
    with connect() as db:r=db.execute('SELECT id,file_name,pdf_bytes,report_count,date_from,date_to FROM authority_pdf_reports WHERE id=?',(pid,)).fetchone()
    if not r:return jsonify(error='Generate the PDF first.'),404
    from mysql_database import load_settings
    settings=load_settings(); settings.update({k:os.environ[k] for k in ('SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','SMTP_FROM') if k in os.environ})
    if not settings.get('SMTP_HOST') or not settings.get('SMTP_FROM'):
        return jsonify(error='Email not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM to backend/.env. PDF download still works.'),503
    status='failed';error=''
    try:
        msg=EmailMessage();msg['Subject']=f'EcoRewards environmental report | {r["date_from"]} – {r["date_to"]}';msg['From']=settings['SMTP_FROM'];msg['To']=email
        msg.set_content(f'Please find attached the EcoRewards environmental summary for {r["date_from"]} to {r["date_to"]}, containing {r["report_count"]} reports. This is a data submission, not a request to undertake unapproved cleanup.\n\nRegards,\nEcoRewards Team')
        msg.add_attachment(bytes(r['pdf_bytes']),maintype='application',subtype='pdf',filename=r['file_name'])
        with smtplib.SMTP(settings['SMTP_HOST'],int(settings.get('SMTP_PORT') or '587'),timeout=20) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            if settings.get('SMTP_USER'):smtp.login(settings['SMTP_USER'],settings.get('SMTP_PASSWORD',''))
            smtp.send_message(msg)
        status='sent'
    except Exception as exc:error=type(exc).__name__+': '+str(exc)[:260]
    with connect() as db:db.execute('INSERT INTO authority_pdf_sends(pdf_id,recipient_email,status,error,created_at) VALUES(?,?,?,?,?)',(pid,email,status,error,NOW()))
    if status=='failed':return jsonify(error='Email could not be sent: '+error),502
    return jsonify(ok=True,status=status,to=email,report_id=pid,meaning='SMTP accepted message; authority acceptance is not confirmed.')

@advanced.get('/api/advanced/admin/pdf-reports/history')
@logged(admin=True)
def pdf_history():
    """Return saved PDF-generation and email history."""
    with connect() as db:
        reports=[dict(r) for r in db.execute('SELECT id,date_from,date_to,region,suburb,category,report_count,file_name,created_at FROM authority_pdf_reports ORDER BY id DESC LIMIT 40').fetchall()]
        sends=[dict(r) for r in db.execute('SELECT pdf_id,recipient_email,status,error,created_at FROM authority_pdf_sends ORDER BY id DESC LIMIT 80').fetchall()]
    return jsonify(reports=reports,sends=sends)

@advanced.get('/cleaner/portal')
@logged()
def cleaner_portal():
    """Render the cleaner workspace."""
    with connect() as db:
        user=db.execute('SELECT role FROM users WHERE id=?',(actor_uid(),)).fetchone()
    if user and user['role']=='admin':return redirect('/admin/intelligence')
    return render_template('cleaner.html')

# Equipment evidence: randomised private upload names, never publicly served.
@advanced.post('/api/advanced/equipment/upload')
@logged()
def equipment_upload():
    """Upload verification equipment photographs."""
    from PIL import Image,UnidentifiedImageError
    import uuid
    f=request.files.get('photo')
    if not f or not f.filename:return jsonify(error='Select an equipment image'),400
    if f.mimetype not in ('image/jpeg','image/png','image/webp'):return jsonify(error='JPEG, PNG or WEBP only'),400
    try:
        img=Image.open(f.stream);img.verify();f.stream.seek(0)
        img=Image.open(f.stream).convert('RGB')
        if img.width*img.height>20_000_000:return jsonify(error='Image too large'),400
        img.thumbnail((1600,1600))
        ref=f'{actor_uid()}_{uuid.uuid4().hex}.jpg'
        directory=Path(__file__).resolve().parent/'private_equipment';directory.mkdir(exist_ok=True)
        img.save(directory/ref,'JPEG',quality=84)
    except (UnidentifiedImageError,OSError):return jsonify(error='Invalid image'),400
    return jsonify(ok=True,reference=ref)

@advanced.get('/api/advanced/equipment/<ref>')
@logged()
def equipment_view(ref):
    """Serve an equipment photo with access checks."""
    from flask import send_from_directory
    if not re.fullmatch(r"[0-9]+_[a-f0-9]{32}\.jpg",ref):return jsonify(error="Invalid reference"),400
    with connect() as db:
        user=db.execute('SELECT role FROM users WHERE id=?',(actor_uid(),)).fetchone()
    if not user or (user['role']!='admin' and not ref.startswith(f'{actor_uid()}_')):return jsonify(error='Not authorised'),403
    directory=Path(__file__).resolve().parent/'private_equipment'
    return send_from_directory(directory,ref)
