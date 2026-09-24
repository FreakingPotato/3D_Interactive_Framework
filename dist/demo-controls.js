import {runtime} from './runtime-config.js';
export function initDemo(app){
 if(!runtime.staticDemo)return;
 app.state.speed=60;document.querySelector('#speed').value='60';
 const button=document.querySelector('#experiment-open');button.disabled=true;button.title='预处理演示 · 本地部署可连接更多数据';document.querySelector('#condition-label').textContent='完整周期 · Demo';
 document.querySelector('.brand small').textContent='3D INTERACTIVE FRAMEWORK';
 const footer=document.querySelector('.page-footer');const link=document.createElement('a');link.href='https://github.com/FreakingPotato/3D_Interactive_Framework';link.target='_blank';link.rel='noreferrer';link.textContent='GitHub · Code & credits ↗';footer.append(link);
 const credits=document.createElement('p');credits.innerHTML='Framework: <a href="https://github.com/FreakingPotato/3D_Interactive_Framework">FreakingPotato / 3D Interactive Framework</a> · Apache-2.0. Examples: <a href="https://github.com/CovertLab/vEcoli">Covert Lab / vEcoli</a>; <a href="https://doi.org/10.1016/j.cell.2026.02.009">Thornburg, Maytin et al. / 4D minimal cell</a> · <a href="https://doi.org/10.5281/zenodo.15579159">data CC BY 4.0</a>. <a href="'+runtime.base+'/credits.html">All credits and licenses ↗</a>';
 document.querySelector('#source-dialog').append(credits);
 const note=document.createElement('small');note.style.cssText='display:block;font-size:11px;color:#8d806c;margin-top:6px';note.textContent=app.state.system==='minimal'?'完整 120 分钟轨迹 · 默认 ×60，约 2 分钟播完；×120 约 1 分钟 · 含真实二分裂空间帧':'完整母细胞记录 · 默认 ×60，约 42 秒 · 模型分裂事件 2530 s；末次观测 2529 s · 三维位置为示意';document.querySelector('.scene-heading h1').after(note);
}
