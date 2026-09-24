import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const page=await browser.newPage({viewport:{width:1000,height:720}});page.setDefaultTimeout(180000);page.setDefaultNavigationTimeout(180000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto((process.env.DEMO_URL||'http://127.0.0.1:8766/framework-demo/')+'?system=minimal');await page.waitForFunction(()=>window.cellSound&&window.minimalObservatory?.ready());
await page.evaluate(()=>{minimalObservatory.setPlaying(false);minimalObservatory.view.quality();});
assert.equal(await page.locator('#speed').inputValue(),'60');assert.equal(await page.evaluate(()=>minimalObservatory.state.meta.times.at(-1)),7200);
await page.evaluate(()=>minimalObservatory.setTime(7200));await page.waitForFunction(()=>minimalObservatory.state.time===7200);
const report=await page.evaluate(()=>({time:minimalObservatory.state.time,cycle:minimalObservatory.state.meta.demo_cycle,frames:minimalObservatory.state.meta.times.length,counts:minimalObservatory.state.frame.particle_count,rendered:minimalObservatory.view.debug().renderedParticles}));assert.equal(report.counts,report.rendered);console.log('FINAL',report);
assert((await page.locator('#run-status').textContent()).includes('已二分裂'));
await page.screenshot({path:'logs/minimal-binary-fission.png'});
await page.locator('#speed').selectOption('120');assert.equal(await page.evaluate(()=>minimalObservatory.state.speed),120);
await page.evaluate(()=>minimalObservatory.setTime(0));await page.waitForFunction(()=>minimalObservatory.state.time===0);assert(!(await page.locator('#run-status').textContent()).includes('已二分裂'));
assert.deepEqual(errors,[]);console.log('PASS native full-cycle endpoints, all final particles rendered, speed 60/120, reversible fission status, no browser errors');
}finally{await browser.close();}
