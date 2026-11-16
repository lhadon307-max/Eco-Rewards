"""Regression checks for the City/Suburb nearby task release."""
import ast, pathlib, re, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class NearbyLocationTests(unittest.TestCase):
    def test_backend_compiles(self):
        for path in ['backend/app.py','backend/advanced_features.py']:
            ast.parse((ROOT/path).read_text())
    def test_location_dictionary_and_routes(self):
        src=(ROOT/'backend/advanced_features.py').read_text()
        for value in ('CITY_SUBURBS','Brisbane City','Chermside','South Brisbane','Gold Coast','/api/advanced/location-options','/api/advanced/location-resolve'):
            self.assertIn(value,src)
    def test_alert_uses_named_location_and_not_untrusted_coords(self):
        src=(ROOT/'backend/advanced_features.py').read_text()
        fun=src[src.index('def save_notify():'):src.index('def distance(',src.index('def save_notify():'))]
        self.assertIn("CITY_SUBURBS.get(city,{}).get(suburb)",fun)
        self.assertIn('Choose a city and suburb',fun)
    def test_cleaner_page_has_dropdowns_and_available_tasks(self):
        src=(ROOT/'frontend/templates/cleaner.html').read_text()
        for item in ('id="alert-city"','id="alert-suburb"','id="cleaner-tasks"','findCleanerTasks()'):
            self.assertIn(item,src)
        for item in ('id="latitude"','id="longitude"'):
            self.assertNotIn(item,src)
    def test_task_search_shows_why_empty(self):
        src=(ROOT/'frontend/static/app.js').read_text()
        for item in ('id="task-city"','id="task-suburb"','published_total','nearest_published_km'):
            self.assertIn(item,src)
if __name__=='__main__':unittest.main(verbosity=2)
