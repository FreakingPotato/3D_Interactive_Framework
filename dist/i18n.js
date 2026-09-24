const dictionary=await(await fetch('/translations.json')).json();
const ordered=Object.keys(dictionary).sort((a,b)=>b.length-a.length);
const escaped=ordered.map(s=>Array.from(s).map(c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join(''));
const pattern=new RegExp(escaped.join('|'),'g');
export let language=localStorage.getItem('ecoli-language')==='en'?'en':'zh';
export function translate(text){return language==='en'?text.replace(pattern,key=>dictionary[key]):text;}
const records=new WeakMap(),attributes=new WeakMap();
function updateText(node){const current=node.nodeValue,record=records.get(node);const source=record&&record.last===current?record.source:current;const next=translate(source);records.set(node,{source,last:next});if(next!==current)node.nodeValue=next;}
function updateElement(el){const recordsForElement=attributes.get(el)||{};for(const key of ['aria-label','title','placeholder']){const current=el.getAttribute(key);if(current==null)continue;const record=recordsForElement[key],source=record&&record.last===current?record.source:current,next=translate(source);recordsForElement[key]={source,last:next};if(current!==next)el.setAttribute(key,next);}attributes.set(el,recordsForElement);}
function scan(root){if(root.nodeType===Node.TEXT_NODE){if(!root.parentElement?.closest('script,style'))updateText(root);return;}if(root.nodeType!==Node.ELEMENT_NODE)return;updateElement(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(n.nodeType===Node.TEXT_NODE){if(!n.parentElement?.closest('script,style'))updateText(n);}else updateElement(n);}}
const observer=new MutationObserver(records=>{observer.disconnect();for(const m of records){if(m.type==='childList')m.addedNodes.forEach(scan);else if(m.type==='characterData')scan(m.target);else updateElement(m.target);}observe();});
function observe(){observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']});}
function apply(){observer.disconnect();scan(document.body);document.documentElement.lang=language==='en'?'en':'zh-CN';document.title=new URLSearchParams(location.search).get('system')==='minimal'?(language==='en'?'Minimal Cell Observatory · JCVI-syn3A':'Minimal Cell Observatory · 最小细胞观察台'):(language==='en'?'E. coli Observatory · Whole-cell Explorer':'E. coli Observatory · 全细胞观察台');const button=document.querySelector('#language');button.textContent=language==='en'?'中文':'EN';button.setAttribute('aria-label',language==='en'?'切换到中文':'Switch to English');observe();}
document.querySelector('#language').onclick=()=>{language=language==='en'?'zh':'en';localStorage.setItem('ecoli-language',language);apply();window.dispatchEvent(new Event('languagechange'));};
apply();
