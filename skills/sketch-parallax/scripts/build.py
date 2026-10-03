#!/usr/bin/env python3
"""Build portable desktop 3D sketch pages from transparent art; no ML required."""
import argparse,base64,html,json,shutil
from pathlib import Path
from PIL import Image,ImageOps

ROOT=Path(__file__).resolve().parents[1]
def encoded(raw,mime):return 'data:'+mime+';base64,'+base64.b64encode(raw).decode()
def js(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
def build(manifest,out,standalone=False):
    manifest=Path(manifest).resolve();spec=json.loads(manifest.read_text(encoding='utf-8'));items=spec['subjects']
    if not 1<=len(items)<=8:raise ValueError('Use 1–8 subjects')
    out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True);data=[];stats=[]
    for i,item in enumerate(items):
        path=(manifest.parent/item['image']).resolve();im=ImageOps.exif_transpose(Image.open(path)).convert('RGBA');alpha=im.getchannel('A')
        if alpha.getextrema()[0]>=250:raise ValueError(f'{path.name}: opaque input; cut out the subject first')
        box=alpha.point(lambda v:255 if v>12 else 0).getbbox()
        if not box:raise ValueError(f'{path.name}: empty alpha')
        box=(max(0,box[0]-12),max(0,box[1]-12),min(im.width,box[2]+12),min(im.height,box[3]+12));im=im.crop(box);im.thumbnail((1050,1800),Image.Resampling.LANCZOS)
        import io
        raw=io.BytesIO();im.save(raw,format='WEBP',quality=93,method=4,exact=True)
        c={'id':str(item.get('id',f'subject-{i+1}')),'name':str(item['name']),'tagline':str(item.get('tagline','')),'color':str(item.get('color','#ab7546')),'image':encoded(raw.getvalue(),'image/webp'),'width':im.width,'height':im.height}
        for field in ('center','yaw'):
            if field in item:c[field]=item[field]
        if 'center' in c and (len(c['center'])!=3 or not all(isinstance(v,(int,float)) for v in c['center'])):raise ValueError('center must be three numbers')
        data.append(c);stats.append({'name':c['name'],'size':[im.width,im.height],'webp_bytes':len(raw.getvalue())})
    audio=''
    if spec.get('audio'):
        audio_path=(manifest.parent/spec['audio']).resolve();audio=encoded(audio_path.read_bytes(),'audio/mpeg')
    data_js='window.AI_CHARACTERS='+js(data)+';window.AI_AUDIO='+js(audio)+';'
    css=(ROOT/'assets/style.css').read_text(encoding='utf-8');engine=(ROOT/'assets/engine.js').read_text(encoding='utf-8');template=(ROOT/'assets/template.html').read_text(encoding='utf-8')
    if not standalone:
        (out/'data.js').write_text(data_js,encoding='utf-8');(out/'style.css').write_text(css,encoding='utf-8');(out/'engine.js').write_text(engine,encoding='utf-8')
    for mode,label in [('mixed','混合穿梭'),('pages','逐页手稿')]:
        text=template
        values={'__TITLE__':html.escape(spec.get('title','手绘的另一维度')),'__MODE_NAME__':label,'__MODE__':mode,'__NAMES__':html.escape(' → '.join(c['name'] for c in data)),'__SCENE_LABEL__':'角色共享一个空间' if mode=='mixed' else '每页独立 3D 空间','__MIXED_CURRENT__':'aria-current="page"' if mode=='mixed' else '', '__PAGES_CURRENT__':'aria-current="page"' if mode=='pages' else ''}
        for key,value in values.items():text=text.replace(key,value)
        if mode=='pages':text=text.replace('▶ 播放穿梭','▶ 播放手稿')
        if standalone:
            text=text.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>').replace('<script src="data.js"></script>','<script>'+data_js+'</script>').replace('<script src="engine.js"></script>','<script>'+engine+'</script>')
        (out/f'{mode}.html').write_text(text,encoding='utf-8')
    (out/'index.html').write_text('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=mixed.html"><a href="mixed.html">混合穿梭</a> · <a href="pages.html">逐页手稿</a>',encoding='utf-8')
    report={'subjects':stats,'audio_embedded':bool(audio),'standalone':standalone,'files':{p.name:p.stat().st_size for p in out.iterdir() if p.is_file()}}
    (out/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False))
    return report
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--manifest',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);ap.add_argument('--standalone',action='store_true',help='Embed each page separately; default shares data.js to avoid duplication');a=ap.parse_args();build(a.manifest,a.out,a.standalone)
