/* Forbidden Duel Memories v2.5 — duel presentation overhaul */
(function(){
const V25='2.5';
function duelVisible(){const d=document.getElementById('duel');return d&&!d.classList.contains('hidden')}
function currentInfo(){
  if(!window.S)return null;
  let c=null,u=null,side='';
  if(S.selectedHand!==null&&S.selectedHand!==undefined&&S.pHand?.[S.selectedHand]!=null){c=C(S.pHand[S.selectedHand]);side='hand';}
  else if(S.selectedField!==null&&S.selectedField!==undefined&&S.pField?.[S.selectedField]){u=S.pField[S.selectedField];c=C(u.id);side='field';}
  else if(S.pHand?.length){c=C(S.pHand[0]);side='idle';}
  return c?{card:c,unit:u,side}:null;
}
function makePreviewCard(c,u){
  const isMon=isMonster(c), art=c.art||'✦';
  const wrap=document.createElement('div');
  wrap.className='previewCard boardCard'+(u?.pos==='def'?' defense':'');
  wrap.dataset.kind=c.kind||'monster';
  wrap.dataset.family=c.family||'';
  wrap.dataset.rarity=c.rarity||'N';
  wrap.innerHTML=`<div class="rarity">${c.rarity||'N'}</div><div class="cname">${c.n}</div><div class="cart"><span>${art}</span><i>${c.family||c.t||''}</i></div><div class="cmeta"><span>${(c.t||'').toUpperCase()}</span><span>${(c.e||'').toUpperCase()}</span></div>${isMon?`<div class="guardian">★ ${(u?.guardian||c.g||'---')}</div><div class="cnums">A ${battleATK(c,u)} / D ${battleDEF(c,u)}</div>`:`<div class="effectDesc">${c.desc||c.kind||''}</div>`}`;
  return wrap;
}
function updatePreview(){
  const panel=document.getElementById('duelPreview');
  if(!panel||!duelVisible()||!window.S){if(panel)panel.innerHTML='';return}
  const info=currentInfo();
  if(!info){panel.innerHTML='';panel.classList.remove('show');return}
  panel.innerHTML='';
  const title=document.createElement('div');
  title.className='previewHeader';
  title.innerHTML=`<b>${info.side==='field'?'CARTA NO CAMPO':info.side==='hand'?'CARTA SELECIONADA':'CARTA EM FOCO'}</b><span>${(info.card.kind||info.card.t||'carta').toUpperCase()}</span>`;
  panel.appendChild(title);
  panel.appendChild(makePreviewCard(info.card,info.unit));
  const meta=document.createElement('div');
  meta.className='previewFooter';
  meta.innerHTML = isMonster(info.card)
   ? `<span>★ ${(info.unit?.guardian||info.card.g||'---')}</span><span>${(info.card.e||'').toUpperCase()}</span><span>${(info.card.family||'').toUpperCase()}</span>`
   : `<span>${(info.card.kind||'CARTA').toUpperCase()}</span><span>${(info.card.family||info.card.e||'').toUpperCase()}</span><span>${(info.card.t||'').toUpperCase()}</span>`;
  panel.appendChild(meta);
  panel.classList.add('show');
}
function updateHint(){
  const el=document.getElementById('duelCommandHint');
  const duel=document.getElementById('duel');
  if(!el||!duelVisible()||!window.S)return;
  let text='Selecione uma carta da sua mão para começar.';
  duel.classList.remove('state-hand','state-field','state-attack','state-fusion');
  if(fusionMode){text='Modo Fusão: escolha de 2 a 5 monstros da mão ou do campo.';duel.classList.add('state-fusion');}
  else if(attackMode){text='Modo Ataque: escolha um alvo inimigo ou cancele com ESC/B.';duel.classList.add('state-attack');}
  else if(S.selectedHand!==null&&S.selectedHand!==undefined){const c=C(S.pHand[S.selectedHand]); text = isMonster(c)?'Carta pronta para ser colocada no campo. Use JOGAR para invocar.':'Carta de suporte selecionada. Use JOGAR para ativar ou posicionar.'; duel.classList.add('state-hand');}
  else if(S.selectedField!==null&&S.selectedField!==undefined&&S.pField[S.selectedField]){const u=S.pField[S.selectedField], c=C(u.id); text = u.pos==='atk' && !S.attacked?.has(S.selectedField) ? `Monstro ${c.n} pronto para atacar.` : `Monstro ${c.n} em foco. Você pode mudar a posição ou encerrar.`; duel.classList.add('state-field');}
  else if(S.side==='e') text='Aguarde: o oponente está executando o turno dele.';
  el.textContent=text;
}
function updateDuelStateFx(){
  const duel=document.getElementById('duel');
  if(!duel||!duelVisible()||!window.S)return;
  duel.classList.toggle('enemyThinking',S.side==='e');
  duel.classList.toggle('playerTurnGlow',S.side==='p');
}
const baseRenderAll=renderAll;
renderAll=function(){const r=baseRenderAll();requestAnimationFrame(()=>{updatePreview();updateHint();updateDuelStateFx();});return r};
const baseShowScreen=showScreen;
showScreen=function(id){const r=baseShowScreen(id);requestAnimationFrame(()=>{updatePreview();updateHint();updateDuelStateFx();});return r};

// Stronger feedback on attack selection
const baseBeginAttack=beginAttack;
beginAttack=function(){const r=baseBeginAttack();requestAnimationFrame(()=>{updateHint();updateDuelStateFx();});return r};

save.gameVersion=V25;persist();
setTimeout(()=>{updatePreview();updateHint();updateDuelStateFx();},0);
console.info('Forbidden Duel Memories v2.5 duel presentation overhaul loaded');
})();
