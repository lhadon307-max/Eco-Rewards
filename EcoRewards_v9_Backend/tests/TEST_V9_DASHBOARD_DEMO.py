import unittest
from pathlib import Path
import ast
ROOT=Path(__file__).resolve().parents[1]
class V9Tests(unittest.TestCase):
 def test_demo_distribution(self):
  t=ast.parse((ROOT/'SEED_20_DEMO_REPORTS.py').read_text())
  rows=next(node.value for node in t.body if isinstance(node,ast.Assign) and any(isinstance(x,ast.Name) and x.id=='ROWS' for x in node.targets))
  data=ast.literal_eval(rows)
  self.assertEqual(len(data),20)
  self.assertEqual(len({x[0] for x in data}),20)
  self.assertEqual([sum(x[-1]==kind for x in data) for kind in ('task','high','pending','resolved')],[10,4,3,3])
 def test_kpi_filters(self):
  s=(ROOT/'frontend/static/app.js').read_text()
  for label in ('Total reports','Completed tasks','High-risk reports','Available EcoTasks'):
   self.assertIn(label,s)
  self.assertIn('function openAdminMetric(',s)
  self.assertIn('function adminReportMatches(',s)
 def test_data_is_explicitly_demo_only(self):
  s=(ROOT/'SEED_20_DEMO_REPORTS.py').read_text()
  self.assertIn('DEMO-V9-',s)
  self.assertIn('FICTIONAL TRAINING DATA',s)
  self.assertIn('if found:',s)
if __name__=='__main__':unittest.main()
