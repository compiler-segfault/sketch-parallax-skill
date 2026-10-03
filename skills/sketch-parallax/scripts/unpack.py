#!/usr/bin/env python3
"""Recover editable compressed assets and a manifest from a built shared-data site."""
import argparse,base64,json
from pathlib import Path
def unpack(site,out):
    site=Path(site).resolve();out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
    text=(site/'data.js').read_text(encoding='utf-8');prefix='window.AI_CHARACTERS=';separator=';window.AI_AUDIO='
    if not text.startswith(prefix) or separator not in text:raise ValueError('Expected a site built by sketch-parallax')
    subjects_text,audio_text=text[len(prefix):].split(separator,1);subjects=json.loads(subjects_text);audio=json.loads(audio_text.rstrip(';'))
    data=[]
    for i,c in enumerate(subjects):
        filename=f'subject-{i+1}.webp';uri=c['image'];header,body=uri.split(',',1)
        if header!='data:image/webp;base64':raise ValueError('Only embedded WebP supported')
        (out/filename).write_bytes(base64.b64decode(body,validate=True));item={k:v for k,v in c.items() if k not in ('image','width','height')};item['image']=filename;data.append(item)
    spec={'title':'手绘的另一维度','subjects':data}
    if audio:
        header,body=audio.split(',',1)
        if header!='data:audio/mpeg;base64':raise ValueError('Expected MP3 audio')
        (out/'music.mp3').write_bytes(base64.b64decode(body,validate=True));spec['audio']='music.mp3'
    (out/'scene.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2),encoding='utf-8');print(out/'scene.json')
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--site',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();unpack(a.site,a.out)
