#!/usr/bin/env python3
"""Inspect local runtime without installing anything or downloading models."""
import importlib.util,json,sys
report={'python':sys.version.split()[0],'executable':sys.executable,'pillow':importlib.util.find_spec('PIL') is not None,'optional_rembg':importlib.util.find_spec('rembg') is not None,'optional_playwright':importlib.util.find_spec('playwright') is not None,'depth_model_required':False,'image_edit_tool':'Agent must inspect available image editing tools; cannot be detected by Python','browser':'WebGL2 required; run verify.py for an actual check'}
print(json.dumps(report,ensure_ascii=False,indent=2));sys.exit(0 if report['pillow'] else 1)
