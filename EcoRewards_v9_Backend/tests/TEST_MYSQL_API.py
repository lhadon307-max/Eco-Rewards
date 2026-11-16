"""Run real Flask API requests against ISOLATED ecorewards_test MySQL database.

REQUIRES: XAMPP running + SETUP_DATABASE.sql executed + backend/.env configured.
This script NEVER writes to the real 'ecorewards' DB. It uses ecorewards_test.
"""
import io, os, sys, unittest, uuid
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'backend'))
os.environ['DB_NAME'] = 'ecorewards_test'  # Override the local .env database name.
import app as eco

class APIIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        eco.init_db()  # Only creates tables and starter records in ecorewards_test.
        cls.client=eco.app.test_client()

    def login(self, email):
        response=self.client.post('/api/login',json={'email':email,'password':'Demo123!'})
        self.assertEqual(response.status_code,200,response.get_json())

    def image(self,color):
        out=io.BytesIO();Image.new('RGB',(80,80),color).save(out,'PNG');out.seek(0)
        return (out,'test.png')

    def test_issue_to_resolved_rewards(self):
        label='MySQL workflow '+uuid.uuid4().hex[:12]
        self.login('maya@demo.com')
        response=self.client.post('/api/reports',data={
            'title':label,'category':'General litter','description':'Test litter in safe grass',
            'location':'West End, Brisbane','latitude':'-27.481','longitude':'153.010',
            'photo':self.image((10,56,110))},content_type='multipart/form-data')
        self.assertEqual(response.status_code,200,response.get_json())
        with eco.connect() as db:
            rid=db.execute('SELECT id FROM reports WHERE title=?',(label,)).fetchone()['id']
        self.login('admin@demo.com')
        response=self.client.post(f'/api/admin/reports/{rid}',json={'action':'verify_publish','site_confirmed':True})
        self.assertEqual(response.status_code,200,response.get_json())
        self.login('alex@demo.com')
        loc={'latitude':-27.481,'longitude':153.010,'radius':2}
        response=self.client.get('/api/tasks/nearby',query_string=loc)
        self.assertEqual(response.status_code,200,response.get_json())
        self.assertIn(rid,[task['id'] for task in response.get_json()['tasks']])
        response=self.client.post(f'/api/reports/{rid}/claim',json={
            **loc,'answers':{key:True for key in ('adult','hazards','location','ppe','permission','stop')},
            'accepted':True})
        self.assertEqual(response.status_code,200,response.get_json())
        response=self.client.post(f'/api/reports/{rid}/complete',data={'photo':self.image((34,80,32))},content_type='multipart/form-data')
        self.assertEqual(response.status_code,200,response.get_json())
        self.login('admin@demo.com')
        response=self.client.post(f'/api/admin/reports/{rid}',json={'action':'resolve'})
        self.assertEqual(response.status_code,200,response.get_json())
        # Resolution can never award identical cleanup points twice.
        again=self.client.post(f'/api/admin/reports/{rid}',json={'action':'resolve'})
        self.assertNotEqual(again.status_code,200)
        with eco.connect() as db:
            report=db.execute('SELECT status,task_status FROM reports WHERE id=?',(rid,)).fetchone()
            self.assertEqual((report['status'],report['task_status']),('resolved','completed'))
            points=db.execute('SELECT SUM(amount) AS n FROM points WHERE report_id=? AND reason=?',
                              (rid,'cleanup_verified')).fetchone()['n']
            self.assertEqual(points,50)

if __name__=='__main__':unittest.main(verbosity=2)
