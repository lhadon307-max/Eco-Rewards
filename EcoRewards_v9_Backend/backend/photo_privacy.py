"""Optional local privacy preprocessing, does not promise comprehensive person redaction.
Detects frontal faces when OpenCV is available; public access is withheld otherwise.
Any result requires human confirmation before broader disclosure.
"""
from pathlib import Path

def preprocess(path):
    """Handle the preprocess stage of the EcoRewards backend."""
    try:
        import cv2
        image=cv2.imread(str(path))
        if image is None:return {'processed':False,'reason':'Unreadable photo'}
        classifier=cv2.CascadeClassifier(cv2.data.haarcascades+'haarcascade_frontalface_default.xml')
        if classifier.empty():return {'processed':False,'reason':'No face model'}
        gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
        faces=classifier.detectMultiScale(gray,scaleFactor=1.08,minNeighbors=4,minSize=(25,25))
        for x,y,w,h in faces:
            image[y:y+h,x:x+w]=cv2.GaussianBlur(image[y:y+h,x:x+w],(0,0),sigmaX=max(10,w//4))
        # Produce separately named redacted version, distinct from original.
        dest=path.with_name(path.stem+'.privacy.jpg')
        if cv2.imwrite(str(dest),image):return {'processed':True,'faces_detected':len(faces),'path':dest}
    except ImportError:
        return {'processed':False,'reason':'OpenCV optional package not installed'}
    except Exception as exc:
        return {'processed':False,'reason':str(exc)[:100]}
    return {'processed':False,'reason':'Could not save redacted image'}
