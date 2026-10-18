"""Generate original schematic exercise GIFs and static posters; no third-party media."""
import base64
import io
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'fitness-media'
OUT.mkdir(exist_ok=True)
SCALE = 2
SIZE = (480, 270)
INK = '#24354B'
ACCENT = '#7959D2'
BG = '#F4F7FB'

def mix(a, b, t):
    return tuple(x + (y-x)*t for x, y in zip(a, b))

def frame(kind, t):
    image = Image.new('RGB', (SIZE[0]*SCALE, SIZE[1]*SCALE), BG)
    d = ImageDraw.Draw(image)
    def point(p): return tuple(round(v*SCALE) for v in p)
    def line(points, color=INK, width=9):
        d.line([point(p) for p in points], fill=color, width=width*SCALE, joint='curve')
        for x, y in points:
            r = width*SCALE/2
            d.ellipse((x*SCALE-r,y*SCALE-r,x*SCALE+r,y*SCALE+r),fill=color)
    def head(p, neck):
        line([p,neck],width=6)
        x,y=p;r=13
        d.ellipse(((x-r)*SCALE,(y-r)*SCALE,(x+r)*SCALE,(y+r)*SCALE),fill=BG,outline=INK,width=4*SCALE)
    line([(55,235),(425,235)], '#D6DDE8', 2)
    if kind == 'Bodyweight_Squat':
        shoulder=mix((250,70),(285,125),t);hip=mix((250,125),(238,175),t);knee=mix((270,175),(302,180),t)
        line([shoulder,hip,knee,(270,225)],width=11)
        line([(255,225),(293,225)],width=7)
        line([shoulder,mix((285,110),(320,135),t),mix((315,110),(350,135),t)],ACCENT,8)
        head((shoulder[0]+8,shoulder[1]-27),shoulder)
    elif kind == 'Pushups':
        shoulder=mix((325,130),(320,185),t);hip=mix((207,177),(205,205),t);elbow=mix((330,178),(370,202),t)
        line([(90,225),hip,shoulder],width=11)
        line([shoulder,elbow,(335,225)],ACCENT,9)
        line([(326,225),(354,225)],width=6)
        head((shoulder[0]+28,shoulder[1]-10),shoulder)
    elif kind == 'Butt_Lift_Bridge':
        hip=mix((255,220),(255,183),t)
        line([(160,215),hip,(330,165),(350,225)],width=11)
        line([(160,215),(205,225),(245,225)],ACCENT,7)
        line([(340,225),(376,225)],width=7)
        head((129,217),(160,215))
    else:
        line([(85,225),(205,195),(325,165)],width=11)
        line([(325,165),(330,225),(390,225)],ACCENT,9)
        head((355,159),(325,165))
        # Subtle breathing cue, while the plank position stays fixed.
        radius=12+4*t
        d.arc(((213-radius)*SCALE,(180-radius)*SCALE,(213+radius)*SCALE,(180+radius)*SCALE),30,150,fill=ACCENT,width=2*SCALE)
    return image.resize(SIZE,Image.Resampling.LANCZOS)

assets={}
for kind in ['Bodyweight_Squat','Pushups','Butt_Lift_Bridge','Plank']:
    frames=[frame(kind,(1-math.cos(2*math.pi*i/40))/2) for i in range(40)]
    gif=io.BytesIO();frames[0].save(gif,format='GIF',save_all=True,append_images=frames[1:],duration=100,loop=0,optimize=True)
    poster=io.BytesIO();frames[0].save(poster,format='PNG',optimize=True)
    for extension,buffer,mime in [('gif',gif,'image/gif'),('png',poster,'image/png')]:
        name=kind+'.'+extension
        (OUT/name).write_bytes(buffer.getvalue())
        assets[name]={'type':mime,'data':base64.b64encode(buffer.getvalue()).decode()}
(ROOT/'fitness-media.mjs').write_text('// Generated original schematic media. Regenerate with generate-fitness-media.py.\nexport const FITNESS_MEDIA='+json.dumps(assets,separators=(',',':'))+';\n',encoding='utf-8')
print('Generated',len(assets),'original exercise GIF/poster assets')
