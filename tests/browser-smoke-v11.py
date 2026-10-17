"""Run locally: python -m pip install playwright; python -m playwright install chromium; python tests/browser-smoke-v11.py"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json
import os
ROOT = Path(__file__).resolve().parents[1]
PAGES = ["index.html", "auth/login/index.html", "worker/dashboard/index.html", "worker/create-permit/basic-info/index.html", "worker/create-permit/risk-assessment/index.html", "worker/create-permit/review-submit/index.html", "worker/permits/index.html", "supervisor/dashboard/index.html", "supervisor/review-queue/index.html", "supervisor/review-permit/index.html", "safety/dashboard/index.html", "safety/review-queue/index.html", "safety/review-permit/index.html", "admin/dashboard/index.html", "admin/pending-permits/index.html", "admin/review-permit/index.html", "safety/risk-command-center/index.html"]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(("127.0.0.1",0),partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
base=f"http://127.0.0.1:{server.server_port}/"
results=[]
try:
 with sync_playwright() as p:
  try:
   browser=p.chromium.launch(headless=True)
  except Exception:
   fallback=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium")
   if not Path(fallback).exists():
    raise
   browser=p.chromium.launch(headless=True, executable_path=fallback, args=["--no-sandbox", "--disable-dev-shm-usage"])
  for width,height,label in [(1440,900,"desktop"),(390,844,"mobile")]:
   context=browser.new_context(viewport={"width":width,"height":height},ignore_https_errors=True)
   for path in PAGES:
    page=context.new_page(); errors=[];failed=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.on("response",lambda r:failed.append(f"{r.status} {r.url}") if r.status>=400 and r.url.startswith(base) else None)
    item={"page":path,"viewport":label}
    try:
     res=page.goto(base+path,wait_until="domcontentloaded",timeout=15000)
     page.wait_for_timeout(600)
     item.update(http=res.status if res else None,title=page.title(),jsErrors=errors[:8],failedRequests=failed[:8],horizontalOverflow=page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 2"))
     item["ok"]=item["http"]==200 and not errors and not failed
    except Exception as exc:item.update(ok=False,exception=str(exc)[:350])
    results.append(item);page.close()
   context.close()
  browser.close()
finally:server.shutdown()
output=ROOT/"docs"/"BROWSER-SMOKE-V11-RESULTS.json";output.write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding="utf-8")
print(json.dumps({"checked":len(results),"failed":[r for r in results if not r["ok"]],"overflow":[r["page"]+" ("+r["viewport"]+")" for r in results if r.get("horizontalOverflow")]},indent=2))
raise SystemExit(1 if any(not r["ok"] for r in results) else 0)
