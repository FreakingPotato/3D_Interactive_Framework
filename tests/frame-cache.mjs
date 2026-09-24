import assert from 'node:assert/strict';
import {FrameCache} from '../dist/frame-cache.js';
let calls=0;const cache=new FrameCache(async key=>{calls++;await new Promise(r=>setTimeout(r,5));return {particles:[Number(key),1,2,3]};},{maxEntries:2,maxBytes:10000});
const [a,b]=await Promise.all([cache.get('1'),cache.get('1')]);assert.equal(a,b);assert.equal(calls,1);await cache.get('1');assert.equal(calls,1);await cache.get('2');await cache.get('3');assert.equal(cache.debug().frames,2);assert(!cache.has('1'));assert(cache.has('3'));
const pending=cache.get('4');cache.clear();await assert.rejects(pending,{name:'AbortError'});assert.equal(cache.debug().frames,0);await cache.get('4');assert(cache.has('4'));
const order=[];const priority=new FrameCache(async key=>{order.push(key);await new Promise(r=>setTimeout(r,10));return {};});priority.prefetch(['background1','background2','background3']);await priority.get('foreground');assert(order.indexOf('foreground')<order.indexOf('background2')||!order.includes('background2'));priority.clear();
console.log('PASS frame cache deduplication, LRU limits, cancellation, reload and foreground priority');
