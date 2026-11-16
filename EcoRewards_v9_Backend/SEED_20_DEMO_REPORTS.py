"""Insert 20 clearly fictional EcoRewards reports for demonstrations.
Run explicitly (never on app startup). Safe to repeat; does not alter real data.
10 low-risk published EcoTasks, 4 high-risk referrals, 3 pending, 3 resolved.
"""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent/'backend'))
from mysql_database import connect,init_schema
from advanced_features import init_advanced,notify_nearby
from werkzeug.security import generate_password_hash
from datetime import datetime,timezone,timedelta

# Approximate suburb-centre coordinates — fictional example incidents only.
# Spread across Brisbane north, inner city, south and west; actual reports require site validation.
ROWS=[
 ('West End',-27.481,153.010,'General litter','Light wrappers beside community garden walkway','task'),
 ('South Brisbane',-27.475,153.018,'Plastic pollution','Plastic bottles on open park lawn','task'),
 ('New Farm',-27.468,153.047,'General litter','Small amounts of paper litter near public park','task'),
 ('Fortitude Valley',-27.457,153.033,'Overflowing bins','Light litter around a public bin','task'),
 ('Toowong',-27.485,152.992,'General litter','Loose packaging near a pedestrian path','task'),
 ('Kelvin Grove',-27.449,153.013,'Plastic pollution','Plastic cups visible on open grass','task'),
 ('Chermside',-27.386,153.031,'General litter','Small paper rubbish near a walkway','task'),
 ('Nundah',-27.402,153.061,'Overflowing bins','Light paper litter near a public bin','task'),
 ('Sunnybank',-27.578,153.059,'Plastic pollution','Plastic wrappers beside a community path','task'),
 ('Carindale',-27.505,153.105,'General litter','Scattered light rubbish near a park entrance','task'),
 ('Brisbane City',-27.470,153.025,'Needles or sharps','Suspected needles; do not approach','high'),
 ('Woolloongabba',-27.489,153.036,'Chemical / hazardous waste','Unidentified chemical container; authority assessment required','high'),
 ('St Lucia',-27.497,153.006,'Road / traffic hazard','Waste beside traffic; unsafe for volunteer cleanup','high'),
 ('Indooroopilly',-27.502,152.973,'Oil or water contamination','Possible fluid discharge near drain; do not touch','high'),
 ('Paddington',-27.460,152.999,'Damaged green space','Potential garden debris; needs permission review','pending'),
 ('Ashgrove',-27.445,152.992,'General litter','Unknown safe site access; awaiting verification','pending'),
 ('Coorparoo',-27.493,153.058,'Overflowing bins','Report awaiting review and site permission','pending'),
 ('Annerley',-27.513,153.033,'General litter','Historical demo cleanup verified as complete','resolved'),
 ('Mount Gravatt',-27.541,153.074,'Plastic pollution','Historical demo cleanup verified as complete','resolved'),
 ('Morningside',-27.466,153.074,'General litter','Historical demo cleanup verified as complete','resolved'),
]

def seed():
 init_schema();init_advanced()
 with connect() as db:
  user=db.execute("SELECT id FROM users WHERE email=?",('ecorewards.demo.reporter@example.invalid',)).fetchone()
  if not user:
   user_id=db.execute('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)',('EcoRewards Demo Reporter','ecorewards.demo.reporter@example.invalid',generate_password_hash('UnusedDemoAccount!'+str(datetime.now(timezone.utc).timestamp())),'user')).lastrowid
  else:user_id=user['id']
  added=0; existing=0; counts={'task':0,'high':0,'pending':0,'resolved':0}; notified=0
  for i,(suburb,lat,lon,cat,desc,kind) in enumerate(ROWS,1):
   marker=f'[DEMO-V9-{i:02}]'
   found=db.execute('SELECT id FROM reports WHERE title LIKE ? AND user_id=?',(marker+'%',user_id)).fetchone()
   if found:
    existing+=1
    if kind=='task': notified+=notify_nearby(db,found['id'],marker+' Cleanup opportunity — '+suburb,lat,lon)
    continue
   status,task,risk={'task':('approved','available','low'),'high':('referred','none','high'),'pending':('pending','none','review'),'resolved':('resolved','completed','low')}[kind]
   created=(datetime.now(timezone.utc)-timedelta(days=(i*2)%28)).isoformat(timespec='seconds')
   title=marker+' '+(('Cleanup opportunity' if kind=='task' else 'Safety referral' if kind=='high' else 'Review needed' if kind=='pending' else 'Resolved cleanup')+' — '+suburb)
   details='FICTIONAL TRAINING DATA — not a real report, worksite, safety approval, or authority referral. '+desc+'. Any real cleanup needs new authorisation and site risk checks.'
   rid=db.execute('''INSERT INTO reports(user_id,title,category,description,location,latitude,longitude,risk,status,task_status,created_at,updated_at,referral_status)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''',(user_id,title,cat,details,suburb+', Brisbane, QLD',lat,lon,risk,status,task,created,created,'demo_only' if kind=='high' else 'none')).lastrowid
   if kind=='task':notified+=notify_nearby(db,rid,title,lat,lon)
   added+=1;counts[kind]+=1
 print(f'Demo import completed. Added: {added}; already present: {existing}; notifications: {notified}.')
 print('Target distribution: 10 published EcoTasks, 4 high-risk, 3 pending, 3 historically resolved.')
 print('NOTE: All DEMO records are fictional, unphotographed and not cleared for real-world volunteer action.')

if __name__=='__main__':seed()
