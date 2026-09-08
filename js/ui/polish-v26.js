/* Forbidden Duel Memories v2.6 — contextual commands, portraits and unique fields */
(function(){
const V26='2.6';
const PORTRAITS=Object.fromEntries(Array.from({length:18},(_,i)=>[i,`assets/portraits/opp${String(i+1).padStart(2,'0')}.svg`]));
const TERRAIN_META={
 'Pradaria':{icon:'☀',label:'PRADARIA',theme:'pradaria'},
 'Floresta Lunar':{icon:'☾',label:'FLORESTA LUNAR',theme:'floresta-lunar'},
 'Montanha':{icon:'⚡',label:'MONTANHA',theme:'montanha'},
 'Oceano':{icon:'≋',label:'OCEANO',theme:'oceano'},
 'Santuário Sombrio':{icon:'◉',label:'SANTUÁRIO SOMBRIO',theme:'santuario-sombrio'},
 'Templo Antigo':{icon:'𓂀',label:'TEMPLO ANTIGO',theme:'templo-antigo'},
 'Desfiladeiro':{icon:'◆',label:'DESFILADEIRO',theme:'desfiladeiro'}
};
function duelVisible(){const d=document.getElementById('duel');return d&&!d.classList.contains('hidden')}
function portraitForOpponent(i){return PORTRAITS[i]||'assets/portraits/opp01.svg'}
function setImg(container,src,cl='portraitAsset'){
 if(!container)return;
 let img=container.querySelector?.('img.'+cl);
 if(!img){container.innerHTML='';img=document.createElement('img');img.className=cl;container.appendChild(img)}
 img.src=src;img.alt='';img.draggable=false;
}
function decorateCampaignPortraits(){
 const highest=Math.max(1,save.unlocked||1);
 document.querySelectorAll('#campaignMap .mapNode').forEach((n,i)=>{
   if(i>=OPP.length)return;const icon=n.querySelector('.nodeIcon');if(!icon)return;
   if(i>=highest){icon.textContent='🔒';return}
   icon.innerHTML=`<img class="mapPortraitAsset" src="${portraitForOpponent(i)}" alt="${OPP[i].name}">`;
 });
 const selected=[...document.querySelectorAll('#campaignMap .mapNode')].findIndex(n=>n.classList.contains('selectedNode'));
 if(selected>=0)decorateCampaignInfo(selected);
}
function decorateCampaignInfo(i){
 const box=document.querySelector('#campaignInfo .campaignPortrait');if(!box||!OPP[i])return;
 box.innerHTML=`<img class="campaignPortraitAsset" src="${portraitForOpponent(i)}" alt="${OPP[i].name}">`;
}
function decorateFreeDuelPortraits(){
 document.querySelectorAll('#freeDuelList .opponentCard').forEach((b,i)=>{const box=b.querySelector('.oppIcon');if(box&&OPP[i])box.innerHTML=`<img class="freePortraitAsset" src="${portraitForOpponent(i)}" alt="${OPP[i].name}">`});
}
function ensureStatusPortraits(){
 const enemy=document.querySelector('.enemyStatus'),player=document.querySelector('.playerStatus');
 const eSrc=currentOpponent>=0?portraitForOpponent(currentOpponent):'assets/portraits/secret-canyon.svg';
 if(enemy){let img=enemy.querySelector('.statusPortrait');if(!img){img=document.createElement('img');img.className='statusPortrait enemyPortraitAsset';enemy.prepend(img)}if(!img.src.endsWith(eSrc))img.src=eSrc;}
 if(player){let img=player.querySelector('.statusPortrait');if(!img){img=document.createElement('img');img.className='statusPortrait playerPortraitAsset';player.prepend(img)}if(!img.src.endsWith('assets/portraits/player.svg'))img.src='assets/portraits/player.svg';}
}
function updateTerrainPresentation(){
 if(!duelVisible()||!S)return;
 const meta=TERRAIN_META[S.terrain]||{icon:'◇',label:String(S.terrain||'NEUTRO').toUpperCase(),theme:'neutral'};
 const duel=document.getElementById('duel'),panel=document.querySelector('.ps1FieldPanel');
 duel.dataset.terrain=meta.theme;
 if(panel){panel.dataset.icon=meta.icon;const span=panel.querySelector('#fieldText');if(span)span.textContent=meta.label;panel.title=(S.terrainBonus||[]).length?'Favorece: '+S.terrainBonus.join(', '):meta.label;}
}

// Contextual command menu while preserving the original button IDs for keyboard/gamepad/tutorial compatibility.
function setButton(btn,show,label,icon,primary=false,handler=null){
 if(!btn)return;btn.classList.toggle('contextHidden',!show);btn.classList.toggle('contextPrimary',!!primary&&show);
 if(show){btn.innerHTML=`<span>${icon}</span> ${label}`;if(handler)btn.onclick=handler;}
}
function cancelAttack(){attackMode=false;renderAll();msg('Ataque cancelado.',500)}
function cancelFusion(){fusionMode=false;fusionSel=[];if(typeof fusionFieldSel!=='undefined')fusionFieldSel=[];S.selectedHand=null;renderAll();msg('Fusão cancelada.',500)}
function updateContextCommands(){
 if(!duelVisible()||!S)return;
 const play=document.getElementById('btnPlay'),fusion=document.getElementById('btnFusion'),attack=document.getElementById('btnAttack'),flip=document.getElementById('btnFlip'),end=document.getElementById('btnEnd');
 [play,fusion,attack,flip,end].forEach(b=>b?.classList.remove('contextPrimary'));
 const handSelected=S.selectedHand!==null&&S.selectedHand!==undefined;
 const fieldSelected=S.selectedField!==null&&S.selectedField!==undefined&&!!S.pField?.[S.selectedField];
 const handCard=handSelected?C(S.pHand[S.selectedHand]):null;
 if(window.FDM_TUTORIAL_ACTIVE){
   setButton(play,true,'JOGAR','▶',false,()=>playSelection());setButton(fusion,true,'FUSÃO','✦',false,()=>toggleFusionMode());setButton(attack,true,'ATACAR','⚔',false,()=>beginAttack());setButton(flip,true,'POSIÇÃO','↻',false,()=>changePosition());setButton(end,true,'FIM','■',false,()=>endTurn());return;
 }
 if(S.side!=='p'||S.over){[play,fusion,attack,flip,end].forEach(b=>b?.classList.add('contextHidden'));return}
 if(attackMode){
   setButton(play,false);setButton(fusion,false);setButton(flip,false);setButton(end,false);
   setButton(attack,true,'CANCELAR','×',true,cancelAttack);return;
 }
 if(fusionMode){
   setButton(play,true,'CONFIRMAR','▶',true,()=>playSelection());
   setButton(fusion,true,'CANCELAR','×',false,cancelFusion);
   setButton(attack,false);setButton(flip,false);setButton(end,false);return;
 }
 if(handSelected){
   setButton(play,true,isMonster(handCard)?'JOGAR':'ATIVAR','▶',true,()=>playSelection());
   setButton(fusion,!!isMonster(handCard),'FUSÃO','✦',false,()=>toggleFusionMode());
   setButton(attack,false);setButton(flip,false);setButton(end,true,'FIM','■',false,()=>endTurn());return;
 }
 if(fieldSelected){
   const unit=S.pField[S.selectedField],canAttack=unit?.pos==='atk'&&!S.attacked?.has(S.selectedField);
   setButton(play,false);
   setButton(fusion,true,'FUSÃO','✦',false,()=>toggleFusionMode());
   setButton(attack,canAttack,'ATACAR','⚔',canAttack,()=>beginAttack());
   setButton(flip,true,'POSIÇÃO','↻',!canAttack,()=>changePosition());
   setButton(end,true,'FIM','■',false,()=>endTurn());return;
 }
 setButton(play,false);setButton(fusion,false);setButton(attack,false);setButton(flip,false);setButton(end,true,'FIM DO TURNO','■',true,()=>endTurn());
}

const baseRenderOpponents=renderOpponents;
renderOpponents=function(){const r=baseRenderOpponents();requestAnimationFrame(decorateCampaignPortraits);return r};
const baseSelectCampaignOpponent=selectCampaignOpponent;
selectCampaignOpponent=function(i,...args){const r=baseSelectCampaignOpponent(i,...args);requestAnimationFrame(()=>decorateCampaignInfo(i));return r};
const baseOpenFreeDuel=openFreeDuel;
openFreeDuel=function(...args){const r=baseOpenFreeDuel(...args);Promise.resolve(r).then(()=>requestAnimationFrame(decorateFreeDuelPortraits));return r};
const baseBeginDuel=beginDuel;
beginDuel=async function(i){const r=await baseBeginDuel(i);requestAnimationFrame(()=>{ensureStatusPortraits();updateTerrainPresentation();updateContextCommands()});return r};
const baseSecret=startSecretDuel;
startSecretDuel=async function(type){const r=await baseSecret(type);requestAnimationFrame(()=>{ensureStatusPortraits();updateTerrainPresentation();updateContextCommands()});return r};
const baseRenderAll=renderAll;
renderAll=function(){const r=baseRenderAll();requestAnimationFrame(()=>{ensureStatusPortraits();updateTerrainPresentation();updateContextCommands()});return r};
const baseShowScreen=showScreen;
showScreen=function(id){const r=baseShowScreen(id);requestAnimationFrame(()=>{if(id==='duel'){ensureStatusPortraits();updateTerrainPresentation();updateContextCommands()}else if(id==='opponents')decorateCampaignPortraits();else if(id==='freeDuelScreen')decorateFreeDuelPortraits();});return r};

save.gameVersion=V26;persist();
setTimeout(()=>{decorateCampaignPortraits();if(duelVisible()){ensureStatusPortraits();updateTerrainPresentation();updateContextCommands()}},0);
console.info('Forbidden Duel Memories v2.6 contextual commands + portraits + unique fields loaded');
})();
