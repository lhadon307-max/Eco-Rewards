"""Opt-in daily/weekly batch exporter for Windows Task Scheduler.
Dry run by default; never contacts a council unless SMTP, recipient verification, opt-in flags and scheduling are configured.
"""
import os,sys,csv,io,smtplib,ssl
from pathlib import Path
from datetime import datetime,timedelta,timezone
from email.message import EmailMessage
from mysql_database import connect
from advanced_features import init_advanced, region_for, NOW

def run(period='weekly',send=False):
    """Handle the run stage of the EcoRewards backend."""
    if period not in ('daily','weekly'):raise ValueError('daily or weekly only')
    init_advanced()
    cutoff=(datetime.now(timezone.utc)-timedelta(days=1 if period=='daily' else 7)).isoformat()[:10]
    with connect() as db:
        recipients=[dict(r) for r in db.execute('SELECT * FROM authority_recipients WHERE active=1 AND verified=1').fetchall()]
        reports=[dict(r) for r in db.execute('SELECT id,title,category,location,risk,status,task_status,created_at,referral_status FROM reports WHERE created_at>=? ORDER BY id',(cutoff,)).fetchall()]
    output_path=Path(__file__).resolve().parent.parent/'authority_exports';output_path.mkdir(exist_ok=True)
    for recipient in recipients:
        group=[]
        for r in reports:
            r['region'],r['suburb']=region_for(r['location'])
            if recipient['region'] not in ('','All',r['region']):continue
            group.append(r)
        buf=io.StringIO();writer=csv.writer(buf)
        writer.writerow(['id','title','category','suburb','region','risk','status','task_status','created_at','referral_status'])
        for r in group:writer.writerow([r.get(k,'') for k in ('id','title','category','suburb','region','risk','status','task_status','created_at','referral_status')])
        csv_content=buf.getvalue();file=output_path/f'{period}_{recipient["id"]}_{datetime.now(timezone.utc).strftime("%Y%m%d")}.csv';file.write_text(csv_content,encoding='utf-8-sig')
        status='draft';error=''
        if send:
            if os.getenv('ECOREWARDS_ENABLE_SCHEDULED_EMAIL')!='1':raise RuntimeError('Explicit schedule-send flag missing. Set ECOREWARDS_ENABLE_SCHEDULED_EMAIL=1 only after verification.')
            host=os.getenv('SMTP_HOST');sender=os.getenv('SMTP_FROM')
            if not host or not sender:raise RuntimeError('SMTP_HOST and SMTP_FROM required')
            try:
                msg=EmailMessage();msg['From']=sender;msg['To']=recipient['email'];msg['Subject']=f'EcoRewards {period} environmental reports'
                msg.set_content(f'Automated {period} report of {len(group)} environmental submissions for the approved region.')
                msg.add_attachment(csv_content.encode(),maintype='text',subtype='csv',filename=file.name)
                with smtplib.SMTP(host,int(os.getenv('SMTP_PORT','587')),timeout=15) as smtp:
                    smtp.starttls(context=ssl.create_default_context())
                    if os.getenv('SMTP_USER'):smtp.login(os.environ['SMTP_USER'],os.getenv('SMTP_PASSWORD',''))
                    smtp.send_message(msg)
                status='sent'
            except Exception as exc:status='failed';error=str(exc)[:400]
        with connect() as db:
            db.execute('INSERT INTO authority_dispatches(recipient_id,recipient_email,region,suburb,period,report_count,status,error,csv_content,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
                       (recipient['id'],recipient['email'],recipient['region'],'All',period,len(group),status,error,csv_content,NOW()))
        print(f'{recipient["label"]}: {len(group)} reports; {status}; {file}')
    if not recipients:print('No enabled, verified recipients: no exports/emails generated.')

if __name__=='__main__':
    period=sys.argv[1] if len(sys.argv)>1 else 'weekly'
    send='--send' in sys.argv
    run(period,send)
