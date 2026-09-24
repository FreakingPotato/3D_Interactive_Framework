// Shared by both systems; preserve the established 10% default on a fresh page.
export function bindContextOpacity(getView){
 const slider=document.querySelector('#context-opacity'),output=document.querySelector('#context-opacity-value');
 function apply(){output.value=slider.value+'%';getView()?.setContextOpacity(Number(slider.value)/100);}
 slider.addEventListener('input',apply);
 document.querySelector('#context-opacity-reset').addEventListener('click',()=>{slider.value='10';apply();});
 apply();
}
