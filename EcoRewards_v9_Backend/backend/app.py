"""EcoRewards backend module: app.

Database-backed functions used by the Flask web/admin/mobile workflows.
"""
"""EcoRewards application server.

Run: python app.py. Flask serves both user and admin dashboards and JSON API.
Local deployment; public launch requires production security and safety review.
"""
import os, uuid, hashlib, math, json, secrets
from mysql_database import connect, init_schema, DBIntegrityError
import photo_verification as pv
from datetime import datetime, timezone, timedelta
from functools import wraps
from pathlib import Path
from flask import redirect, Flask, request, jsonify, render_template, session, send_from_directory, g
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

BASE = Path(__file__).resolve().parent
# Database is now XAMPP MySQL/MariaDB. Connection settings: backend/.env
UPLOADS = BASE / 'uploads'; UPLOADS.mkdir(exist_ok=True)
# Frontend lives outside backend; Flask still serves /static/* and HTML normally.
app = Flask(__name__, static_folder=str(BASE.parent / 'frontend' / 'static'),
            template_folder=str(BASE.parent / 'frontend' / 'templates'))
from mysql_database import load_settings
from advanced_features import advanced, init_advanced, screening, notify_nearby, NOW
from photo_privacy import preprocess as privacy_preprocess
app.register_blueprint(advanced)
app.secret_key = load_settings().get('ECOREWARDS_SECRET', os.environ.get('ECOREWARDS_SECRET','LOCAL_ONLY_SET_SECRET_IN_ENV'))
app.config['MAX_CONTENT_LENGTH'] = 6 * 1024 * 1024  # Cap uploads at 6MB.
# Cookies cannot be read from JavaScript; same-site limits cross-site cookie sending.
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax')
ALLOWED = {'jpg', 'jpeg', 'png', 'webp'}
RISK_CATEGORIES = {'Chemical / hazardous waste', 'Needles or sharps', 'Oil or water contamination', 'Road / traffic hazard', 'Unknown material'}


# PURPOSE: Provide the current UTC timestamp for saved records and audit logs.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def now():
    """Return UTC time for timestamped database records and audit entries."""
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


# PURPOSE: Connect to local XAMPP MySQL/MariaDB using a restricted app account.
# All queries use a compatibility wrapper in mysql_database.py.
# That wrapper handles MySQL parameter placeholders and transactions.

# PURPOSE: Return a consistent JSON error and HTTP status to the frontend.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def error(msg, status=400):
    """Build a consistent JSON error response with an HTTP status."""
    return jsonify({'error': msg}), status



# Separate API tokens for native devices; never store or log plaintext tokens in MySQL.
def init_mobile_auth():
    """Ensure the hashed mobile bearer-token table exists in MySQL."""
    with connect() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS mobile_auth_tokens (
            token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL,
            expires_at VARCHAR(40) NOT NULL, created_at VARCHAR(40) NOT NULL,
            INDEX idx_mobile_auth_user(user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")

def issue_mobile_token(uid):
    """Generate a random mobile session token and store only its hash."""
    raw = secrets.token_urlsafe(48)
    digest = hashlib.sha256(raw.encode()).hexdigest()
    expiry = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(timespec='seconds')
    with connect() as db:
        db.execute('INSERT INTO mobile_auth_tokens(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)',
                   (digest, uid, expiry, now()))
    return raw

@app.before_request
def authenticate_mobile_request():
    """Check bearer authentication before each Flask request."""
    g.mobile_uid = None
    value = request.headers.get('Authorization','')
    if not value.startswith('Bearer '): return
    raw = value[7:].strip()
    if len(raw) < 40 or len(raw)>256: return
    with connect() as db:
        item = db.execute('SELECT user_id,expires_at FROM mobile_auth_tokens WHERE token_hash=?',
                          (hashlib.sha256(raw.encode()).hexdigest(),)).fetchone()
    if item and item['expires_at'] > now(): g.mobile_uid = item['user_id']

@app.get('/api/mobile/health')
def mobile_health():
    """Provide a lightweight mobile connection health check."""
    return jsonify(ok=True,api='EcoRewards mobile API',database='MySQL',authenticated=bool(current_user()))

# PURPOSE: Look up the currently signed-in account using its session ID.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def current_user():
    """Read the currently authenticated account for a request."""
    uid = getattr(g, 'mobile_uid', None) or session.get('uid')
    if not uid: return None
    with connect() as con:
        r = con.execute('SELECT id,name,email,role FROM users WHERE id=?', (uid,)).fetchone()
    return dict(r) if r else None


# PURPOSE: Block unauthenticated requests and protect admin-only actions.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def login_required(admin=False):
    """Protect data-changing endpoints; admin routes require admin role."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user: return error('Please log in first.', 401)
            if admin and user['role'] != 'admin': return error('Admin access required.', 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# PURPOSE: Validate photo files, resize them and save under unpredictable names.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def save_photo(file):
    """Validate the actual image with Pillow and store using a random filename."""
    if not file or not file.filename: return None
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in ALLOWED: raise ValueError('Upload JPG, PNG or WEBP images only.')
    from PIL import Image, UnidentifiedImageError
    try:
        image = Image.open(file.stream)
        image.verify()
        file.stream.seek(0)
        image = Image.open(file.stream).convert('RGB')
        if image.width * image.height > 20_000_000: raise ValueError('Image too large.')
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError('File is not a valid image.') from exc
    # Generate a standard JPEG, discarding EXIF/GPS metadata for privacy.
    image.thumbnail((1700, 1700))
    name = f'{uuid.uuid4().hex}.jpg'
    image.save(UPLOADS / name, 'JPEG', quality=86)
    privacy_preprocess(UPLOADS / name)  # best-effort; public access requires redacted artifact
    return name


# PURPOSE: Make a basic visual image fingerprint for similarity comparisons.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def photo_hash(filename):
    """Simple perceptual average hash: useful to flag similar uploads, NOT reliable AI proof."""
    if not filename: return None
    from PIL import Image, ImageOps
    with Image.open(UPLOADS / filename) as im:
        grey = ImageOps.grayscale(im).resize((8, 8))
        vals = list(grey.get_flattened_data() if hasattr(grey, 'get_flattened_data') else grey.getdata())
    avg = sum(vals) / len(vals)
    return ''.join('1' if p >= avg else '0' for p in vals)


# PURPOSE: Count bits that differ between two image fingerprints.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def hamming(a, b):
    """Compare perceptual hashes for image similarity."""
    return sum(c != d for c, d in zip(a, b)) if a and b else 64


# PURPOSE: Create or migrate database tables and initialise local demo records.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def init_db():
    """Create MySQL tables (if missing) and initialise starter records.

    NEVER deletes existing records. Existing SQLite data can be imported with
    MIGRATE_SQLITE_TO_MYSQL.py instead of generating new example records.
    """
    init_schema()
    init_advanced()
    init_mobile_auth()
    with connect() as con:
        n=con.execute('SELECT COUNT(*) FROM users').fetchone()[0]
        if n == 0:
            demo=[('Maya Green','maya@demo.com','user'),
                  ('Alex River','alex@demo.com','user'),
                  ('EcoRewards Admin','admin@demo.com','admin')]
            for name,email,role in demo:
                con.execute('INSERT INTO users(name,email,password,role) VALUES (?,?,?,?)',
                            (name,email,generate_password_hash('Demo123!'),role))
        # Populate a few sample issues only when the database has no reports.
        n=con.execute('SELECT COUNT(*) FROM reports').fetchone()[0]
        if n == 0:
            records=[
                (1,'Litter near the community garden','General litter','A few plastic bottles and wrappers beside the walking path.','West End, Brisbane','low','approved','none',-27.4810,153.0100),
                (2,'Overflowing bin at riverside','Overflowing bins','The public bin is overflowing; light loose paper is nearby.','South Brisbane, QLD','low','approved','none',-27.4745,153.0180),
                (1,'Suspicious drums beside creek','Chemical / hazardous waste','Unknown drums near water. Do not touch or approach.','Brisbane, QLD','high','referred','none',None,None),
                (2,'Small litter on park grass','General litter','Light visible litter on open grass; site permission still required.','New Farm, Brisbane','low','pending','none',None,None),
            ]
            for uid,title,cat,desc,loc,risk,status,task,lat,lon in records:
                con.execute('INSERT INTO reports(user_id,title,category,description,location,risk,status,task_status,latitude,longitude,created_at,updated_at,referral_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    (uid,title,cat,desc,loc,risk,status,task,lat,lon,now(),now(),
                    'pending_external' if status=='referred' else 'none'))


# PURPOSE: Load the user website; the browser JavaScript renders its screens.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/')
def page(): return render_template('index.html')


# PURPOSE: Load the same frontend shell with administrator navigation.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/admin')
def admin_page(): return redirect('/admin/intelligence')


# PURPOSE: Serve an authorised uploaded image to the browser.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/uploads/<name>')
@login_required()
def uploaded(name):
    # PRIVACY: only the reporter, assigned cleaner, admin, or a publicly
    # published/verified community task can view its related evidence image.
    """Serve an uploaded file after access checks."""
    user = current_user()
    with connect() as con:
        related = con.execute('''SELECT user_id,assignee_id,status,task_status FROM reports
            WHERE photo=? OR after_photo=? LIMIT 1''', (name, name)).fetchone()
    if not related:
        return error('Photo not found.', 404)
    authorised = (user['role'] == 'admin' or user['id'] in
                  (related['user_id'], related['assignee_id']) or
                  (related['status'] in ('approved','resolved') and
                   related['task_status'] in ('available','in_progress','evidence_review','completed')))
    if not authorised:
        return error('You do not have access to this photo.', 403)
    # Reporter/admin/assignee may view original for authorised verification.
    # Other users see a processed copy only; if unavailable, hide the photo.
    privileged=(user['role']=='admin' or user['id'] in (related['user_id'],related['assignee_id']))
    if not privileged:
        redacted=Path(name).stem+'.privacy.jpg'
        if not (UPLOADS / redacted).exists():return error('Privacy review pending for this image.',403)
        return send_from_directory(UPLOADS,secure_filename(redacted))
    return send_from_directory(UPLOADS, secure_filename(name))


# PURPOSE: Return logged-in user information and their accumulated EcoPoints.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/api/me')
def me():
    """Return user profile, account role and point balance."""
    user = current_user()
    if not user: return jsonify({'user': None})
    with connect() as con:
        balance = con.execute('SELECT COALESCE(SUM(amount),0) FROM points WHERE user_id=?',(user['id'],)).fetchone()[0]
    return jsonify({'user': user, 'points': balance})


# PURPOSE: Check account credentials and open an authenticated session.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.post('/api/login')
def login():
    """Authenticate credentials and issue a session when requested."""
    data = request.get_json(silent=True) or {}
    with connect() as con:
        u = con.execute('SELECT * FROM users WHERE email=?',(str(data.get('email','')).lower().strip(),)).fetchone()
    if not u or not check_password_hash(u['password'],str(data.get('password',''))): return error('Incorrect email or password.',401)
    session.clear(); session['uid'] = u['id']
    if data.get('mobile') is True:
        return jsonify({'ok':True,'token':issue_mobile_token(u['id'])})
    return jsonify({'ok': True})


# PURPOSE: Create a new community account after validating supplied details.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.post('/api/register')
def register():
    """Create a new user after validating their details."""
    d = request.get_json(silent=True) or {}
    name,email,pwd = str(d.get('name','')).strip(),str(d.get('email','')).lower().strip(),str(d.get('password',''))
    if len(name)<2 or '@' not in email or len(pwd)<8: return error('Enter name, valid email and a password with 8+ characters.')
    try:
        with connect() as con:
            cur = con.execute('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)',(name,email,generate_password_hash(pwd),'user'))
            uid = cur.lastrowid
    except DBIntegrityError: return error('Email already registered.')
    session.clear(); session['uid'] = uid
    if d.get('mobile') is True:
        return jsonify({'ok':True,'token':issue_mobile_token(uid)})
    return jsonify({'ok':True})


# PURPOSE: Clear the current session to sign the user out.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.post('/api/logout')
def logout():
    """Revoke or clear the current user session."""
    bearer = request.headers.get('Authorization','')
    if bearer.startswith('Bearer '):
        digest=hashlib.sha256(bearer[7:].strip().encode()).hexdigest()
        with connect() as db: db.execute('DELETE FROM mobile_auth_tokens WHERE token_hash=?',(digest,))
    session.clear()
    return jsonify({'ok':True})


# PURPOSE: Save an auditable points transaction and prevent repeated awards.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def points_award(con,uid,rid,reason,amount):
    """UNIQUE constraint stops double point payments for the same action."""
    con.execute('INSERT IGNORE INTO points(user_id,report_id,reason,amount,created_at) VALUES(?,?,?,?,?)',(uid,rid,reason,amount,now()))


# PURPOSE: Record admin and report changes for future review.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def audit(con,rid,action,detail=''):
    """Write a traceable record of an action."""
    con.execute('INSERT INTO events(report_id,actor_id,action,detail,created_at) VALUES(?,?,?,?,?)',(rid,(current_user() or {}).get('id'),action,detail,now()))


# PURPOSE: Return relevant reports according to the signed-in user role.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/api/reports')
@login_required()
def reports():
    """List environmental reports visible to the requester."""
    user = current_user()
    with connect() as con:
        rows = con.execute('''SELECT r.*, u.name reporter_name, a.name assignee_name FROM reports r JOIN users u ON u.id=r.user_id LEFT JOIN users a ON a.id=r.assignee_id ORDER BY r.id DESC''').fetchall()
    # PRIVACY: a regular account can only see its own reports, its claimed
    # tasks, and approved public EcoTasks. Private safety/identity fields
    # are never sent for another person's report.
    out=[]
    for r in rows:
        obj=dict(r)
        is_admin = user['role']=='admin'
        is_owner = user['id']==obj['user_id']
        is_cleaner = user['id']==obj.get('assignee_id')
        is_public = (obj['status'] in ('approved','resolved') and
                     obj['task_status'] in ('available','in_progress','evidence_review','completed'))
        if not (is_admin or is_owner or is_cleaner or is_public):
            continue
        if not (is_admin or is_cleaner):
            obj.pop('safety_answers',None)
            obj.pop('consent_at',None)
            obj.pop('unsafe_reason',None)
        if not (is_admin or is_owner or is_cleaner):
            obj.pop('user_id',None)
            obj.pop('assignee_id',None)
        for field in ('photo_sha256','photo_dhash','photo_crophashes','photo_hash'):
            obj.pop(field,None)
        out.append(obj)
    return jsonify({'reports':out})


# PURPOSE: Accept a new environmental issue, validate fields and store its photo.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.post('/api/reports')
@login_required()
def create_report():
    """Validate and store an environmental issue report with evidence."""
    user=current_user()
    title,category,description,location=[str(request.form.get(k,'')).strip() for k in ('title','category','description','location')]
    if not all((title,category,description,location)): return error('Complete all required fields.')
    if max(map(len,(title,category,description,location)))>1500: return error('Text is too long.')
    # Store geographic coordinates provided by GPS or a selected location.
    # Text-only locations remain valid reports, but cannot appear as nearby tasks until geolocated.
    lat_raw, lon_raw = request.form.get('latitude','').strip(), request.form.get('longitude','').strip()
    lat = lon = None
    if lat_raw or lon_raw:
        try:
            lat, lon = float(lat_raw), float(lon_raw)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180): raise ValueError()
        except (ValueError, TypeError): return error('Enter valid latitude and longitude, or leave both empty.')
    if lat is None or lon is None: return error('Find your location or use GPS before submitting a report.')
    photo=None
    try:
        upload=request.files.get('photo')
        if not upload:return error('Please upload an environmental issue photo.')
        raw=upload.stream.read()
        upload.stream.seek(0)
        original_sha=pv.sha256_bytes(raw)
        photo=save_photo(upload)
        if not photo:return error('Please upload a photo of the issue.')
        phash=photo_hash(photo)  # Keep legacy aHash for backward compatibility.
        fingerprints=pv.analyse_file(UPLOADS/photo,original_sha)
        matches=[]
        with connect() as con:
            old=con.execute('''SELECT id,photo_sha256,photo_dhash,photo_crophashes,latitude,longitude,category
                FROM reports WHERE photo IS NOT NULL''').fetchall()
            for previous in old:
                old_fp={'sha256':previous['photo_sha256'],'dhash':previous['photo_dhash']}
                try:old_fp['crops']=json.loads(previous['photo_crophashes'] or '[]')
                except (ValueError,TypeError):old_fp['crops']=[]
                finding=pv.compare(fingerprints,old_fp)
                if finding:
                    matches.append((previous['id'],finding))
                # Same category and same area may indicate same real-world issue,
                # not photo fraud. Show as a separate location hint.
                elif previous['latitude'] is not None and previous['longitude'] is not None and previous['category']==category:
                    if distance_km(lat,lon,previous['latitude'],previous['longitude'])<=0.15:
                        matches.append((previous['id'],{'kind':'nearby_issue','distance':None,
                            'explanation':'Same category reported within 150 metres. Might be a different view of one issue.'}))
            duplicate=bool(matches)
            risk='high' if category in RISK_CATEGORIES else 'review'
            cur=con.execute('''INSERT INTO reports(user_id,title,category,description,location,latitude,longitude,
                photo,photo_hash,photo_sha256,photo_dhash,photo_crophashes,risk,status,task_status,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                (user['id'],title,category,description,location,lat,lon,photo,phash,original_sha,
                fingerprints['dhash'],json.dumps(fingerprints['crops']),risk,
                'flagged' if duplicate else 'pending','none',now(),now()))
            rid=cur.lastrowid
            for old_id, finding in matches[:30]:
                con.execute('''INSERT IGNORE INTO photo_matches
                    (report_id,matched_report_id,match_type,hash_distance,explanation,created_at)
                    VALUES (?,?,?,?,?,?)''',(rid,old_id,finding['kind'],finding['distance'],finding['explanation'],now()))
            classification,reasons=screening(category,description,duplicate)
            con.execute('INSERT INTO ai_assessments(report_id,result,reasons,method,created_at) VALUES(?,?,?,?,?)',
                        (rid,classification,json.dumps(reasons),'prototype_rules_v1_not_image_ai',NOW()))
            if classification=='hazard_hold':
                con.execute("UPDATE reports SET risk='high',status='flagged',updated_at=? WHERE id=?",(now(),rid))
            audit(con,rid,'report_submitted',f'{len(matches)} potential photo/location matches; screening={classification}')
        return jsonify({'ok':True,'similar_image_flag':duplicate,'photo_check':'review_flagged' if duplicate else 'no_match_found',
                        'potential_matches':len(matches)})
    except ValueError as exc:
        if photo and (UPLOADS/photo).exists(): (UPLOADS/photo).unlink()
        return error(str(exc))


# PURPOSE: Fetch one report row by ID for task and admin operations.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def get_report(con,rid): return con.execute('SELECT * FROM reports WHERE id=?',(rid,)).fetchone()


# TASK DISCOVERY: the user must choose their location and a 2/5/10 km radius.
# Haversine calculates straight-line distance, not road or walking distance.
# PURPOSE: Calculate straight-line geographical distance using coordinates.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def distance_km(lat1, lon1, lat2, lon2):
    """Compute approximate geographic distance between coordinates."""
    a1, a2 = math.radians(lat1), math.radians(lat2)
    delta_lat, delta_lon = math.radians(lat2-lat1), math.radians(lon2-lon1)
    h = math.sin(delta_lat/2)**2 + math.cos(a1)*math.cos(a2)*math.sin(delta_lon/2)**2
    return 6371.0 * 2 * math.asin(math.sqrt(min(1,h)))


# PURPOSE: Validate the location and radius sent from EcoTasks search.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
def parse_task_location(data):
    """Read stored coordinates for task search."""
    try:
        lat, lon, radius = float(data['latitude']), float(data['longitude']), int(data['radius'])
        if not (-90<=lat<=90 and -180<=lon<=180 and radius in (2,5,10)): raise ValueError()
        return lat, lon, radius
    except (TypeError, ValueError, KeyError): return None


# SEARCH LOCATION: user-triggered lookup, not autocomplete.
# Public OpenStreetMap Nominatim is a best-effort service and may rate-limit.
# Keep it below 1 request/second across this local development installation.
_location_cache = {}
_last_geocode = [0.0]


# PURPOSE: Look up a place so users can find nearby EcoTasks.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/api/locations/search')
@login_required()
def location_search():
    """Return location filtering choices for clients."""
    from urllib.parse import urlencode
    from urllib.request import Request, urlopen
    from time import monotonic
    q = str(request.args.get('q','')).strip()[:150]
    if len(q)<3: return error('Enter a suburb or address (at least 3 characters).')
    key=q.casefold()
    if key in _location_cache:return jsonify(_location_cache[key])
    if monotonic()-_last_geocode[0]<1.2:return error('Please wait a moment before searching again.',429)
    _last_geocode[0]=monotonic()
    # This only sends the user-entered location text to the geocoding provider.
    url='https://nominatim.openstreetmap.org/search?'+urlencode({'q':q,'format':'json','limit':'1','countrycodes':'au'})
    try:
        req=Request(url,headers={'User-Agent':'EcoRewards-EducationalLocal/1.0 (local university project)', 'Accept':'application/json'})
        with urlopen(req,timeout=8) as response:
            found=json.loads(response.read(50000).decode('utf-8'))
        if not found:return error('Location not found. Try a suburb plus city, or use GPS.',404)
        place=found[0]
        result={'latitude':float(place['lat']),'longitude':float(place['lon']),'label':place['display_name'],'attribution':'© OpenStreetMap contributors'}
        if len(_location_cache)>100:_location_cache.clear()
        _location_cache[key]=result
        return jsonify(result)
    except Exception:
        return error('Location search is unavailable right now. Use GPS instead.',503)


# PURPOSE: List only published, unclaimed tasks within the selected distance.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/api/tasks/nearby')
@login_required()
def nearby_tasks():
    """List eligible published tasks within the chosen radius."""
    params = parse_task_location(request.args)
    if not params: return error('Choose your location and a 2, 5 or 10 km radius.')
    lat, lon, radius = params
    with connect() as con:
        rows = con.execute("""SELECT r.id,r.title,r.category,r.description,r.location,r.latitude,r.longitude,
            r.photo,r.task_status,r.status FROM reports r WHERE r.status='approved'
            AND r.risk='low' AND r.task_status='available'
            AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL""").fetchall()
    result=[]
    for item in rows:
        task=dict(item)
        km=distance_km(lat,lon,task['latitude'],task['longitude'])
        if km <= radius:
            task['distance_km']=round(km,1)
            result.append(task)
    result.sort(key=lambda r:r['distance_km'])
    # Provide useful empty-state diagnostics without publishing restricted reports.
    nearest=min((distance_km(lat,lon,r['latitude'],r['longitude']) for r in rows),default=None)
    return jsonify({'tasks':result,'radius':radius,'count':len(result),
                    'published_total':len(rows),
                    'nearest_published_km':round(nearest,1) if nearest is not None else None})


# PURPOSE: Save safety acknowledgement and claim an eligible EcoTask in one step.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.post('/api/reports/<int:rid>/claim')
@login_required()
def claim(rid):
    """ONE action: verify pre-published task, safety answers and reserve it.

    Admin must have reviewed and published the task BEFORE it appears in EcoTasks.
    No second admin approval is needed after a complete consent submission.
    This consent is an acknowledgement, not a release of legal responsibility.
    """
    d=request.get_json(silent=True) or {}
    params=parse_task_location(d)
    if not params: return error('Choose your location and a valid search radius before claiming.')
    lat,lon,radius=params
    answers=d.get('answers',{})
    keys=['adult','hazards','location','ppe','permission','stop']
    if not isinstance(answers,dict) or not all(answers.get(k) is True for k in keys) or d.get('accepted') is not True:
        return error('Complete all safety questions and acknowledge the task conditions before claiming.')
    with connect() as con:
        cleaner=con.execute('SELECT status,expires_at FROM cleaner_applications WHERE user_id=?',(current_user()['id'],)).fetchone()
        if not cleaner or cleaner['status']!='approved' or (cleaner['expires_at'] and cleaner['expires_at']<NOW()):
            return error('Approved, current EcoCleaner verification is required before claiming.',403)
        r=get_report(con,rid)
        if not r:return error('Task not found.',404)
        if r['status']!='approved' or r['risk']!='low' or r['task_status']!='available':return error('Task is not available.')
        if r['latitude'] is None or r['longitude'] is None or distance_km(lat,lon,r['latitude'],r['longitude'])>radius:
            return error('This task is outside your selected distance. Search again.')
        cur=con.execute("""UPDATE reports SET task_status='in_progress',assignee_id=?,consent_at=?,
            safety_answers=?,updated_at=? WHERE id=? AND task_status='available' AND status='approved' AND risk='low' """,
            (current_user()['id'],now(),json.dumps(answers),now(),rid))
        if cur.rowcount!=1:return error('Someone else has already claimed this task.')
        audit(con,rid,'task_claimed_with_consent','Safety form submitted at claim; task had been published by admin')
    return jsonify({'ok':True,'status':'in_progress','message':'Task claimed. You may begin only within the published scope and safety conditions; stop if anything changes.'})


# PURPOSE: Suspend a task immediately if the assigned person reports danger.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.post('/api/reports/<int:rid>/stop')
@login_required()
def unsafe_stop(rid):
    """Suspend a claimed task when the cleaner reports a hazard."""
    d=request.get_json(silent=True) or {}
    reason=str(d.get('reason','Unsafe or uncertain conditions'))[:500]
    with connect() as con:
        r=get_report(con,rid)
        if not r or r['assignee_id']!=current_user()['id'] or r['task_status'] not in ('claimed','safety_review','in_progress'):return error('No active assignment.')
        # Fail closed: unsafe tasks stay suspended until admin assessment.
        con.execute("UPDATE reports SET task_status='unsafe_suspended',risk='high',unsafe_reason=?,updated_at=? WHERE id=?",(reason,now(),rid))
        audit(con,rid,'unsafe_stop',reason)
    return jsonify({'ok':True,'message':'Task suspended. Move to safety. In an emergency call 000. No existing earned points removed.'})


# PURPOSE: Allow the worker to withdraw and flag the task for admin handling.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.post('/api/reports/<int:rid>/withdraw')
@login_required()
def withdraw(rid):
    """Release or withdraw from a task according to backend rules."""
    with connect() as con:
        r=get_report(con,rid)
        if not r or r['assignee_id']!=current_user()['id'] or r['task_status'] not in ('claimed','safety_review','in_progress'):return error('No active assignment.')
        # Normal withdrawal is held for admin review rather than auto-reassigned.
        con.execute("UPDATE reports SET task_status='withdrawn_review',updated_at=? WHERE id=?",(now(),rid))
        audit(con,rid,'task_withdrawn')
    return jsonify({'ok':True})


# PURPOSE: Accept after-cleanup evidence and put it in review status.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.post('/api/reports/<int:rid>/complete')
@login_required()
def complete(rid):
    """Submit cleanup evidence for review; do not self-approve points."""
    with connect() as con:
        r=get_report(con,rid)
        if not r or r['assignee_id']!=current_user()['id'] or r['task_status']!='in_progress':return error('You must have an active, consented cleanup task.')
    try:
        photo=save_photo(request.files.get('photo'))
        if not photo:return error('Please add an after-cleanup photo.')
    except ValueError as exc:return error(str(exc))
    # CONCURRENCY: task may have been stopped or withdrawn while the upload
    # was processing. Update ONLY if this cleaner still owns an active task.
    with connect() as con:
        cur=con.execute('''UPDATE reports SET after_photo=?,task_status='evidence_review',updated_at=?
            WHERE id=? AND assignee_id=? AND task_status='in_progress' ''',
            (photo,now(),rid,current_user()['id']))
        if cur.rowcount != 1:
            (UPLOADS/photo).unlink(missing_ok=True)
            return error('Task is no longer active. Evidence was not submitted.', 409)
        audit(con,rid,'cleanup_evidence_submitted')
    return jsonify({'ok':True})


# PURPOSE: Apply an admin decision: verify, publish, refer, or resolve an issue.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.post('/api/admin/reports/<int:rid>')
@login_required(admin=True)
def admin_action(rid):
    """Apply an authorised administrator decision to a report or task."""
    d=request.get_json(silent=True) or {}; action=d.get('action')
    with connect() as con:
        r=get_report(con,rid)
        if not r:return error('Report not found.',404)
        # ONE REVIEW ACTION: verify a low-risk report AND publish it as an EcoTask.
        # The backend checks all conditions atomically, avoiding a second review.
        if action=='verify_publish':
            if r['status'] not in ('pending','flagged') or r['task_status']!='none':
                return error('Only new, unassigned reports can be verified and published.')
            if r['risk']=='high' or r['category'] in RISK_CATEGORIES:
                return error('This potentially hazardous report cannot become a public cleanup task.')
            if r['latitude'] is None or r['longitude'] is None:
                return error('Location coordinates are required before publishing an EcoTask.')
            if d.get('site_confirmed') is not True:
                return error('Confirm independent site assessment, permission, cleanup scope and safety controls.')
            con.execute("UPDATE reports SET status='approved',risk='low',task_status='available',updated_at=? WHERE id=?",(now(),rid))
            points_award(con,r['user_id'],rid,'report_verified',10)
            notify_nearby(con,rid,r['title'],r['latitude'],r['longitude'])
        elif action=='approve':
            if r['status'] not in ('pending','flagged'):return error('Only pending reports can be approved.')
            if r['risk']=='high':return error('High-risk reports cannot become community tasks.')
            con.execute("UPDATE reports SET status='approved',risk='low',task_status='none',updated_at=? WHERE id=?",(now(),rid))
            points_award(con,r['user_id'],rid,'report_verified',10)
        elif action=='refer':
            con.execute("UPDATE reports SET status='referred',risk='high',task_status='none',referral_status='pending_external',updated_at=? WHERE id=?",(now(),rid))
        elif action=='reject':
            if r['status'] not in ('pending','flagged'):return error('Only pending reports can be rejected.')
            con.execute("UPDATE reports SET status='rejected',task_status='none',updated_at=? WHERE id=?",(now(),rid))
        elif action=='publish':
            # PUBLISH GATE: admin decides which reviewed report is safe and useful
            # as an EcoTask. This is the ONLY action that creates a public task.
            if r['status']!='approved' or r['task_status']!='none' or r['risk']!='low':
                return error('Only approved, low-risk reports not already listed can be published.')
            if r['latitude'] is None or r['longitude'] is None:
                return error('Set location coordinates before publishing an EcoTask.')
            if d.get('site_confirmed') is not True:
                return error('Confirm site assessment, lawful access, permitted cleanup scope and safety controls before publishing.')
            con.execute("UPDATE reports SET task_status='available',updated_at=? WHERE id=?",(now(),rid))
            notify_nearby(con,rid,r['title'],r['latitude'],r['longitude'])
        elif action=='unpublish':
            # Removing an AVAILABLE task is safe: it is not currently claimed.
            if r['task_status']!='available':return error('Only unclaimed published tasks can be removed.')
            con.execute("UPDATE reports SET task_status='none',updated_at=? WHERE id=?",(now(),rid))
        elif action=='resolve':
            # Final evidence review closes BOTH the task and its originating report.
            if r['task_status']!='evidence_review':return error('Completion evidence required.')
            con.execute("UPDATE reports SET task_status='completed',status='resolved',updated_at=? WHERE id=?",(now(),rid))
            points_award(con,r['assignee_id'],rid,'cleanup_verified',50)
        elif action=='decline_evidence':
            if r['task_status']!='evidence_review':return error('No evidence pending.')
            con.execute("UPDATE reports SET task_status='in_progress',updated_at=? WHERE id=?",(now(),rid))
        elif action=='reopen':
            if r['task_status'] not in ('withdrawn_review','unsafe_suspended'):return error('Task is not held for review.')
            if r['task_status']=='unsafe_suspended':return error('Unsafe task cannot be reopened directly. Requires a new independent assessment; stay suspended in this demo.')
            if d.get('site_confirmed') is not True:return error('Confirm site permission and repeat safety review.')
            con.execute("UPDATE reports SET task_status='available',assignee_id=NULL,consent_at=NULL,safety_answers=NULL,updated_at=? WHERE id=?",(now(),rid))
        else:return error('Unknown admin action.')
        audit(con,rid,'admin_'+str(action))
    return jsonify({'ok':True})


# ===== ADMIN PHOTO VERIFICATION =====
# Review flags against earlier reports; images still require human judgement.
# PURPOSE: Return detected photo matches and evidence for admin review.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/api/admin/reports/<int:rid>/photo-checks')
@login_required(admin=True)
def admin_photo_checks(rid):
    """Return photo review checks for administrators."""
    with connect() as con:
        source=get_report(con,rid)
        if not source:return error('Report not found.',404)
        matches=[dict(row) for row in con.execute("""SELECT m.matched_report_id,m.match_type,m.hash_distance,
            m.explanation,r.title,r.photo,r.location,r.status
            FROM photo_matches m JOIN reports r ON r.id=m.matched_report_id
            WHERE m.report_id=? ORDER BY
            CASE m.match_type WHEN 'exact_file' THEN 0 WHEN 'similar_image' THEN 1
            WHEN 'possible_crop' THEN 2 ELSE 3 END,m.id DESC LIMIT 30""",(rid,)).fetchall()]
    return jsonify({'report_id':rid,'matches':matches,'count':len(matches),
                    'online_check':'Not enabled. Free local checks cannot search the public web.',
                    'notice':'A match is a review hint, not proof of fraud. Review evidence and context before deciding.'})


# Admin-only operations data. Used by the separate rewards ledger and activity log.
# Never serve detailed internal data to regular community users.
# PURPOSE: Provide overview, audit, rewards and member information to admins.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/api/admin/operations')
@login_required(admin=True)
def admin_operations():
    """Summarise operational dashboard records."""
    with connect() as con:
        rewards = [dict(x) for x in con.execute("""SELECT p.*, u.name FROM points p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC LIMIT 150""").fetchall()]
        actions = [dict(x) for x in con.execute("""SELECT e.*, r.title, u.name AS actor_name FROM events e JOIN reports r ON r.id=e.report_id LEFT JOIN users u ON u.id=e.actor_id ORDER BY e.id DESC LIMIT 150""").fetchall()]
        users = [dict(x) for x in con.execute("SELECT id,name,email,role FROM users ORDER BY name").fetchall()]
    return jsonify({'points': rewards, 'events': actions, 'users': users})


# ===== ADMIN PERSON PROFILE API =====
# PURPOSE: Fetch one person's full activity without scrolling the global event log.
# This endpoint is restricted to authenticated administrators.
# PURPOSE: Return one person’s reports, tasks, points and history.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/api/admin/users/<int:uid>/profile')
@login_required(admin=True)
def admin_user_profile(uid):
    """Review a selected user profile as administrator."""
    with connect() as con:
        user = con.execute('SELECT id,name,email,role FROM users WHERE id=?', (uid,)).fetchone()
        if not user: return error('User not found.', 404)
        # Reports created by the person OR assigned to them for cleanup.
        related = [dict(row) for row in con.execute('''
            SELECT r.*, reporter.name AS reporter_name, worker.name AS assignee_name
            FROM reports r JOIN users reporter ON reporter.id=r.user_id
            LEFT JOIN users worker ON worker.id=r.assignee_id
            WHERE r.user_id=? OR r.assignee_id=? ORDER BY r.created_at DESC, r.id DESC
        ''', (uid, uid)).fetchall()]
        rewards = [dict(row) for row in con.execute('''
            SELECT id,report_id,reason,amount,created_at FROM points
            WHERE user_id=? ORDER BY id DESC''',(uid,)).fetchall()]
        # Include both actions the person performed AND updates to their own/assigned reports.
        # SELECT DISTINCT prevents duplicate rows when person is reporter and assignee.
        activities = [dict(row) for row in con.execute('''
            SELECT DISTINCT e.id,e.report_id,e.actor_id,e.action,e.detail,e.created_at,
                   r.title, actor.name AS actor_name
            FROM events e JOIN reports r ON r.id=e.report_id
            LEFT JOIN users actor ON actor.id=e.actor_id
            WHERE e.actor_id=? OR r.user_id=? OR r.assignee_id=?
            ORDER BY e.id DESC LIMIT 1000''',(uid,uid,uid)).fetchall()]
    return jsonify({'user':dict(user),'reports':related,'points':rewards,'events':activities,
       'summary':{'reports_submitted':sum(r['user_id']==uid for r in related),
                  'tasks_claimed':sum(r['assignee_id']==uid for r in related),
                  'points_earned':sum(p['amount'] for p in rewards)}})


# PURPOSE: Return events connected to a selected environmental issue.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.get('/api/events/<int:rid>')
@login_required()
def events(rid):
    # PRIVATE AUDIT: allow the reporter, assigned cleaner, or admin only.
    """Fetch recent system audit and activity events."""
    user=current_user()
    with connect() as con:
        report=get_report(con,rid)
        if not report:return error('Report not found.',404)
        if user['role']!='admin' and user['id'] not in (report['user_id'],report['assignee_id']):
            return error('Access denied to this report history.',403)
        rows=con.execute('SELECT action,detail,created_at FROM events WHERE report_id=? ORDER BY id DESC',(rid,)).fetchall()
    return jsonify({'events':[dict(r) for r in rows]})


# PURPOSE: Tell the user when an uploaded image exceeds the maximum upload size.
# WHERE: Backend API / database. See docs/CODE_GUIDE.md for usage.
@app.errorhandler(413)
def big(_):return error('Image too large. Maximum 6 MB.',413)


if __name__=='__main__':
    init_db()
    print('\nEcoRewards is ready: http://127.0.0.1:5000\n')
    app.run(host=os.environ.get('ECOREWARDS_BIND','127.0.0.1'),port=5000,debug=False)
