"""Offline row/schema tests only: does not claim a live MySQL test."""
import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from mysql_database import Row,SCHEMA
class TestAdapter(unittest.TestCase):
    def test_row_access(self):
        r=Row({'id':9,'status':'approved'})
        self.assertEqual(r[0],9)
        self.assertEqual(r['status'],'approved')
        self.assertEqual(dict(r)['id'],9)
    def test_schema(self):
        self.assertEqual(len(SCHEMA),5)
        self.assertTrue(all('ENGINE=InnoDB' in ddl for ddl in SCHEMA))
        self.assertTrue(any('uq_reward_once' in ddl for ddl in SCHEMA))
if __name__=='__main__':unittest.main(verbosity=2)
