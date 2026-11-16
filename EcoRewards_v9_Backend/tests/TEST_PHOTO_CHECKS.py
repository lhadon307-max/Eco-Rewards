# Add the backend directory to Python's import path, because tests now live in tests/.
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))

"""Run on Windows: py TEST_PHOTO_CHECKS.py (Pillow dependency only)."""
import unittest
from PIL import Image, ImageDraw
import photo_verification as verify

class PhotoCheckTests(unittest.TestCase):
    def setUp(self):
        self.im=Image.new('RGB',(250,180),'white')
        d=ImageDraw.Draw(self.im)
        d.rectangle((23,29,122,112), fill='#ef4031')
        d.ellipse((142,27,229,153), fill='#1972c4')

    def signature(self,im):
        return {'sha256':None,'dhash':verify.dhash(im),'crops':verify.crop_hashes(im)}

    def test_exact_original_bytes(self):
        a={'sha256':verify.sha256_bytes(b'abc'),'dhash':None}
        self.assertEqual(verify.compare(a,a)['kind'],'exact_file')

    def test_resized_copy(self):
        a=self.signature(self.im)
        b=self.signature(self.im.resize((500,360)))
        self.assertEqual(verify.compare(a,b)['kind'],'similar_image')

    def test_hash_is_64bits(self):
        self.assertEqual(len(verify.dhash(self.im)),16)

    def test_unrelated_photo_not_matched(self):
        base=self.signature(self.im)
        second=Image.new('RGB',(250,180),'white')
        d=ImageDraw.Draw(second)
        for x in range(0,250,12):d.line((x,0,249-x,179),fill='black',width=3)
        self.assertIsNone(verify.compare(base,self.signature(second)))

if __name__=='__main__':unittest.main(verbosity=2)
