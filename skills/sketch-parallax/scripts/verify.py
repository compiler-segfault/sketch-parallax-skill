#!/usr/bin/env python3
"""Verify offline WebGL modes, isolated pages, movement and variable subject counts."""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
async def verify(folder,qa):
    qa.mkdir(parents=True,exist_ok=True);reports={}
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for mode in ('mixed','pages'):
            page=await browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            await page.goto((folder/f'{mode}.html').resolve().as_uri());await page.wait_for_function('window.__ready || window.__error',timeout=30000)
            assert await page.evaluate('window.__ready'),await page.evaluate('window.__error')
            n=await page.locator('.character').count();assert 1<=n<=8
            await page.screenshot(path=str(qa/f'{mode}-front.png'))
            await page.evaluate('''()=>{window.__draws=0;const gl=document.getElementById('art').getContext('webgl2'),draw=gl.drawArrays.bind(gl);gl.drawArrays=(...args)=>{window.__draws++;draw(...args);};}''')
            for i in range(n):
                await page.evaluate('(i)=>{window.__draws=0;window.__selectSubject(i);}',i)
                if mode=='pages':assert await page.evaluate('window.__draws')==14
                await page.screenshot(path=str(qa/f'{mode}-subject-{i+1}.png'))
            await page.evaluate('window.__selectSubject(0)');eye=await page.evaluate('window.__lastFrame.eye');r=await page.locator('#art').bounding_box();x=r['x']+r['width']*.6;y=r['y']+r['height']*.5
            await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+100,y+10,steps=5);await page.mouse.up();assert eye!=await page.evaluate('window.__lastFrame.eye');await page.screenshot(path=str(qa/f'{mode}-side.png'))
            await page.locator('#reset').click();assert eye==await page.evaluate('window.__lastFrame.eye')
            await page.locator('#zoom-in').click();assert await page.evaluate('Math.hypot(...window.__lastFrame.eye.map((v,i)=>v-window.__lastFrame.target[i]))')<8
            await page.locator('#depth').evaluate('(el)=>{el.value="2";el.dispatchEvent(new Event("input"));}');assert (await page.evaluate('window.__interactionState()'))['depth']==2
            await page.locator('#reset').click();await page.locator('#play').click();await page.wait_for_timeout(450);assert (await page.evaluate('window.__interactionState()'))['playing'];await page.mouse.click(x,y);assert not (await page.evaluate('window.__interactionState()'))['playing']
            world=await page.evaluate('window.__sceneSnapshot()');await page.evaluate('window.__renderAt(window.__getDuration()*.6)');assert world==await page.evaluate('window.__sceneSnapshot()');assert not errors,errors
            reports[mode]={'subjects':n,'isolated_page_draw_calls':14 if mode=='pages' else None,'offline_load':True,'drag_zoom_depth_reset_play':True,'fixed_world':True,'errors':errors,'statistics':await page.evaluate('window.__statistics')};await page.close()
        await browser.close()
    (qa/'report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(reports,ensure_ascii=False))
if __name__=='__main__':
    a=argparse.ArgumentParser(description=__doc__);a.add_argument('--site',type=Path,required=True);a.add_argument('--qa',type=Path,required=True);args=a.parse_args();asyncio.run(verify(args.site,args.qa))
