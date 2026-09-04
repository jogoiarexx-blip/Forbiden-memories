/* Forbidden Duel Memories v1.9 — PS1-inspired duel presentation */
(function(){
const V19_VERSION='1.9';
let hoverCardId=null;

function duelVisible(){const d=document.getElementById('duel');return d&&!d.classList.contains('hidden')}
function activeCardInfo(){
  if(!S)return null;
  if(hoverCardId){const c=C(hoverCardId);if(c)return {card:c,unit:null};}
  if(S.selectedHand!==null&&S.selectedHand!==undefined){const c=C(S.pHand[S.selectedHand]);if(c)return {card:c,unit:null};}
  if(S.selectedField!==null&&S.selectedField!==undefined&&S.pField[S.selectedField]){const u=S.pField[S.selectedField],c=C(u.id);if(c)return {card:c,unit:u};}
  const first=S.pHand?.[0];return first?{card:C(first),unit:null}:null;
}
function updateDuelInspector(){
  if(!S)return;
  const info=activeCardInfo(),c=info?.card,u=info?.unit;
  const name=document.getElementById('duelInfoName'),atk=document.getElementById('duelInfoAtk'),def=document.getElementById('duelInfoDef'),type=document.getElementById('duelInfoType'),guard=document.getElementById('duelInfoGuardian'),elem=document.getElementById('duelInfoElement');
  if(!name)return;
  if(!c){name.textContent='SELECIONE UMA CARTA';atk.textContent='⚔ ---';def.textContent='▣ ---';type.textContent='---';guard.textContent='★ ---';elem.textContent='---';return}
  name.textContent=c.n;
  if(isMonster(c)){
    atk.textContent='⚔ '+battleATK(c,u);
    def.textContent='▣ '+battleDEF(c,u);
    type.textContent=(c.t||'MONSTRO').toUpperCase();
    guard.textContent='★ '+(u?.guardian||c.g||'---');
    elem.textContent=(c.e||c.family||'').toUpperCase();
  }else{
    atk.textContent=(c.kind||c.t||'CARTA').toUpperCase();
    def.textContent='';type.textContent=(c.t||'').toUpperCase();guard.textContent='';elem.textContent=(c.family||c.e||'').toUpperCase();
  }
}
function updatePS1Hud(){
  if(!S)return;
  const p=document.getElementById('playerDeckCount'),e=document.getElementById('enemyDeckCount');
  if(p)p.textContent=String(S.pDeck?.length??0).padStart(2,'0');
  if(e)e.textContent=String(S.eDeck?.length??0).padStart(2,'0');
  const ft=document.getElementById('fieldText');if(ft)ft.textContent=(S.terrain||'NEUTRO').toUpperCase();
  const duel=document.getElementById('duel');if(duel)duel.dataset.terrain=(S.terrain||'neutro').toLowerCase().replace(/\s+/g,'-');
  updateDuelInspector();
}

const baseRenderAll=renderAll;
renderAll=function(){const r=baseRenderAll();if(duelVisible())requestAnimationFrame(updatePS1Hud);return r};
const baseRenderHUD=renderHUD;
renderHUD=function(){const r=baseRenderHUD();updatePS1Hud();return r};

// Hover previews on PC; touch selection still uses the normal game state.
document.addEventListener('pointerover',ev=>{
  if(!duelVisible())return;
  const hand=ev.target.closest?.('#hand .boardCard');
  if(hand){const cards=[...document.querySelectorAll('#hand .boardCard')],i=cards.indexOf(hand);if(i>=0&&S?.pHand?.[i]){hoverCardId=S.pHand[i];updateDuelInspector();}}
  const zoneCard=ev.target.closest?.('#playerZone .boardCard');
  if(zoneCard){const cards=[...document.querySelectorAll('#playerZone .boardCard')],slots=[...document.querySelectorAll('#playerZone .slot')],slot=zoneCard.closest('.slot'),i=slots.indexOf(slot);if(i>=0&&S?.pField?.[i]){hoverCardId=S.pField[i].id;updateDuelInspector();}}
});
document.addEventListener('pointerout',ev=>{if(!duelVisible())return;if(ev.target.closest?.('#hand .boardCard,#playerZone .boardCard')){hoverCardId=null;updateDuelInspector();}});

// Keyboard controller closer to console navigation.
document.addEventListener('keydown',ev=>{
  if(!duelVisible()||!S||S.over)return;
  if(ev.key==='Escape'&&attackMode){attackMode=false;renderAll();msg('Ataque cancelado.',500)}
});

// Keep the selected card visually centered in the hand carousel.
const baseHandTap=handTap;
handTap=function(i){const r=baseHandTap(i);requestAnimationFrame(()=>{const el=document.querySelectorAll('#hand .boardCard')[i];el?.scrollIntoView?.({behavior:'smooth',block:'nearest',inline:'center'});updateDuelInspector();});return r};

save.gameVersion=V19_VERSION;persist();
setTimeout(updatePS1Hud,0);
console.info('Forbidden Duel Memories v1.9 PS1 duel UI loaded');
})();
