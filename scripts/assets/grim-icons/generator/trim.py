import sys
from PIL import Image
kind=sys.argv[1]
for n in sys.argv[2:]:
    p=f'output-grim/icons/{kind}/{n}.png'
    im=Image.open(p).convert('RGB'); w,h=im.size; c=round(h*0.92)
    im.crop(((w-c)//2,0,(w-c)//2+c,c)).resize((w,h),Image.Resampling.LANCZOS).save(p)
    print('trimmed',p)
