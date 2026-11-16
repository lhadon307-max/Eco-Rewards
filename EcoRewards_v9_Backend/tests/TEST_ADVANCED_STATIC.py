"""Offline regression checks for advanced modules (no running MySQL required)."""
import ast, pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class AdvancedStaticTests(unittest.TestCase):
    def test_backend_parses(self):
        for name in ('app.py','mysql_database.py','advanced_features.py','scheduled_authority.py','photo_privacy.py'):
            ast.parse((ROOT/'backend'/name).read_text(encoding='utf-8'))
    def test_advanced_contains_authority_and_cleaner_endpoints(self):
        s=(ROOT/'backend'/'advanced_features.py').read_text()
        for marker in ('/api/advanced/admin/dispatch','/api/advanced/cleaner/apply','/api/advanced/admin/cleaners','/api/advanced/analytics','/api/advanced/equipment/upload','/api/advanced/notifications/preferences'):
            self.assertIn(marker,s)
    def test_no_default_email_send(self):
        s=(ROOT/'backend'/'scheduled_authority.py').read_text()
        self.assertIn("ECOREWARDS_ENABLE_SCHEDULED_EMAIL",s)
        self.assertIn("send=False",s)
    def test_cleaner_verification_claim_gate(self):
        s=(ROOT/'backend'/'app.py').read_text()
        self.assertIn("Approved, current EcoCleaner verification is required",s)
    def test_privacy_public_fallback(self):
        s=(ROOT/'backend'/'app.py').read_text()
        self.assertIn('Privacy review pending for this image.',s)
if __name__=='__main__':unittest.main(verbosity=2)
