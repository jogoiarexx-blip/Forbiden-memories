/* Forbidden Duel Memories v2.4 — duel polish & feedback */
(function(){
const V24='2.4';
let lastPLP=null,lastELP=null,lastSide=null;
function duel(){return document.getElementById('duel')}
function visible(){const d=duel();return d&&!d.classList.contains('hidden')}
function reduced(){return !!(window.GAME_SETTINGS?.reducedMotion||document.body.classList.contains('reduceMotion'))}
function showTurnBanner(text,enemy=false){
  if(!visible())return;
  let el=document.getElementById('v24TurnBanner');
  if(!el){el=document.createElement('div');el.id='v24TurnBanner';el.className='v24TurnBanner';document.body.appendChild(el)}
  el.textContent=text;el.classList.toggle('enemy',enemy);el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),reduced()?250:760);
}
function updateContext(){
  if(!S||!visible())return;
  const d=duel();d.classList.toggle('attackSelecting',!!attackMode);
  document.querySelectorAll('.ps1CommandPanel .action').forEach(x=>x.classList.remove('v24Recommended'));
  const c=S.selectedHand!==null&&S.selectedHand!==undefined?C(S.pHand[S.selectedHand]):null;
  if(fusionMode)document.getElementById('btnFusion')?.classList.add('v24Recommended');
  else if(c)document.getElementById('btnPlay')?.classList.add('v24Recommended');
  else if(S.selectedField!==null&&S.selectedField!==undefined){
    const u=S.pField[S.selectedField];
    if(u?.pos==='atk'&&!S.attacked?.has(S.selectedField))document.getElementById('btnAttack')?.classList.add('v24Recommended');
    else document.getElementById('btnFlip')?.classList.add('v24Recommended');
  }else document.getElementById('btnEnd')?.classList.add('v24Recommended');
}
function pulseLP(){
  if(!S||!visible())return;
  const rows=document.querySelectorAll('.statusRow');
  const er=rows[0],pr=rows[1];
  if(lastPLP!==null&&S.pLP!==lastPLP){pr?.classList.remove('v24Damage','v24Heal');void pr?.offsetWidth;pr?.classList.add(S.pLP<lastPLP?'v24Damage':'v24Heal');setTimeout(()=>pr?.classList.remove('v24Damage','v24Heal'),500)}
  if(lastELP!==null&&S.eLP!==lastELP){er?.classList.remove('v24Damage','v24Heal');void er?.offsetWidth;er?.classList.add(S.eLP<lastELP?'v24Damage':'v24Heal');setTimeout(()=>er?.classList.remove('v24Damage','v24Heal'),500)}
  lastPLP=S.pLP;lastELP=S.eLP;
  if(lastSide!==null&&S.side!==lastSide)showTurnBanner(S.side==='p'?'SEU TURNO':'TURNO INIMIGO',S.side!=='p');
  lastSide=S.side;
}
const baseRenderAll=renderAll;
renderAll=function(){const r=baseRenderAll();requestAnimationFrame(()=>{updateContext();pulseLP()});return r};

// Animate the physical card leaving the hand and entering the selected slot.
const baseSummon=summonFromHand;
summonFromHand=function(idx,pos,faceDown,guardian=null){
  let ghost=null,start=null;
  if(visible()&&!reduced()){
    const cardEl=document.querySelectorAll('#hand .boardCard')[idx];
    if(cardEl){start=cardEl.getBoundingClientRect();ghost=cardEl.cloneNode(true);ghost.classList.add('v24CardGhost');Object.assign(ghost.style,{left:start.left+'px',top:start.top+'px',width:start.width+'px',height:start.height+'px',margin:'0'});document.body.appendChild(ghost)}
  }
  const r=baseSummon(idx,pos,faceDown,guardian);
  if(ghost){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const slot=S?.selectedField!==null?document.querySelectorAll('#playerZone .slot')[S.selectedField]:null;
      const target=slot?.getBoundingClientRect();
      if(target){ghost.style.left=(target.left+target.width*.15)+'px';ghost.style.top=(target.top+target.height*.08)+'px';ghost.style.width=(target.width*.7)+'px';ghost.style.height=(target.height*.84)+'px';ghost.classList.add('arrived')}
      setTimeout(()=>ghost.remove(),560);
    }));
  }
  return r;
};

// Better turn feedback when the player explicitly ends their turn.
const baseEndTurn=endTurn;
endTurn=function(){if(S?.side==='p')showTurnBanner('TURNO INIMIGO',true);return baseEndTurn()};

// On entering a duel, initialize feedback state without accidental flashes.
const baseShowScreen=showScreen;
showScreen=function(id){const r=baseShowScreen(id);if(id==='duel'&&S){lastPLP=S.pLP;lastELP=S.eLP;lastSide=S.side;setTimeout(()=>showTurnBanner('DUEL START',false),180)}return r};

save.gameVersion=V24;persist();
setTimeout(updateContext,0);
console.info('Forbidden Duel Memories v2.4 polish loaded');
})();
