

const LEGACY_ID_MAP={21:201,22:202,23:203,24:204,25:205,26:206,27:207,28:208,101:311,102:312,103:313,104:314,105:301,106:302,107:321,108:322,109:323,110:324};
function migrateLegacySave(s){
 if(!s)return s;
 if(Array.isArray(s.deck))s.deck=s.deck.map(id=>LEGACY_ID_MAP[id]||id).filter(id=>C(id));
 if(s.collection){
   const n={};
   Object.entries(s.collection).forEach(([id,q])=>{let mapped=LEGACY_ID_MAP[id]||Number(id);if(C(mapped))n[mapped]=(n[mapped]||0)+q});
   s.collection=n;
 }
 return s
}

let save=migrateLegacySave(JSON.parse(localStorage.getItem("fdm_save")||"null"))||{
 stars:0,wins:0,losses:0,unlocked:1,bestRank:"-",
 collection:Object.fromEntries(DB.filter(c=>!c.fusion).map(c=>[c.id,c.kind==="monster"?3:2])),
 deck:[...STARTER_DECK]
};
if(!save.collection) save.collection={};
DB.filter(c=>!c.fusion).forEach(c=>{
 if(save.collection[c.id]===undefined){
   save.collection[c.id]=c.rarity==="N"?2:(c.rarity==="R"?1:0);
 }
});
STARTER_DECK.forEach(id=>{save.collection[id]=Math.max(save.collection[id]||0,STARTER_DECK.filter(x=>x===id).length)});
if(!save.deck||!save.deck.length) save.deck=[...STARTER_DECK];
if(save.bestRank===undefined) save.bestRank="-";
if(save.unlocked>OPP.length) save.unlocked=OPP.length;
if(save.campaignWins===undefined)save.campaignWins={};
if(save.storyFlags===undefined)save.storyFlags={};
if(save.secretWins===undefined)save.secretWins={};
if(save.ngPlus===undefined)save.ngPlus=0;
if(save.gameCleared===undefined)save.gameCleared=false;
let S=null, currentOpponent=0, msgTimer=null, fusionMode=false, fusionSel=[], attackMode=false, deckFilter="all";
let storyQueue=[],storyIndex=0,storyDone=null,pendingDuel=null,storyCurrentKey="",freeDuelMode=false;
function makeLazyAudio(src){let a=new Audio();a.preload="none";a.src=src;a.volume=.62;return a}
const SFX={summon:makeLazyAudio("assets/sfx/summon.wav"),attack:makeLazyAudio("assets/sfx/attack.wav"),destroy:makeLazyAudio("assets/sfx/destroy.wav"),magic:makeLazyAudio("assets/sfx/magic.wav"),fusion:makeLazyAudio("assets/sfx/fusion.wav"),boss:makeLazyAudio("assets/sfx/boss.wav"),story:makeLazyAudio("assets/sfx/story.wav")};
Object.values(SFX).forEach(a=>{a.preload="none";a.volume=.62});
function playSfx(name){let a=SFX[name];if(!a)return;try{a.currentTime=0;a.play().catch(()=>{})}catch(e){}}


function playStory(key,done=null,title=""){
 let lines=STORY[key]||[];if(!lines.length){if(done)done();return}
 storyQueue=lines;storyIndex=0;storyDone=done;storyCurrentKey=key;
 document.getElementById("storyRegionTitle").textContent=title||"MEMÓRIAS PROIBIDAS";
 document.getElementById("storyScreen").classList.remove("hidden");
 renderStoryLine()
}
function renderStoryLine(){
 let l=storyQueue[storyIndex];if(!l)return;
 document.getElementById("storyPortrait").textContent=l.portrait||"📜";
 document.getElementById("storySpeaker").textContent=l.speaker||"Narrador";
 document.getElementById("storyText").textContent=l.text||"";
 let choices=document.getElementById("storyChoices");choices.innerHTML="";
 document.getElementById("storyNext").style.display=l.choices?"none":"inline-block";
 if(l.choices){
   l.choices.forEach(ch=>{
     let b=document.createElement("button");b.className="storyChoiceBtn";b.textContent=ch.text;
     b.onclick=()=>chooseStory(ch);choices.appendChild(b)
   })
 }
 playSfx("story")
}
function chooseStory(ch){
 save.storyFlags[ch.flag]=ch.value;persist();
 document.getElementById("storyNext").style.display="inline-block";
 storyIndex++;
 if(storyIndex>=storyQueue.length){finishStory();return}
 renderStoryLine()
}
function nextStoryLine(){
 storyIndex++;
 if(storyIndex>=storyQueue.length){finishStory();return}
 renderStoryLine()
}
function skipStory(){finishStory()}
function finishStory(){
 document.getElementById("storyScreen").classList.add("hidden");
 let cb=storyDone;storyDone=null;storyQueue=[];storyIndex=0;if(cb)cb()
}
function maybePlayPrologue(){
 if(save.storyPrologue)return;
 playStory("prologue",()=>{save.storyPrologue=true;persist();
   if(!save.storyFlags.path_safe&&!save.storyFlags.path_secret){
     playStory("choice_0",()=>openOpponent(),"ESCOLHA DE CAMINHO")
   }else openOpponent()
 },"PRÓLOGO")
}
function persist(){localStorage.setItem("fdm_save",JSON.stringify(save));updateNGPlusButton()}
function updateNGPlusButton(){
 let b=document.getElementById("btnNGPlus");if(b)b.style.display=save.gameCleared?"block":"none"
}
function startNewGamePlus(){
 if(!save.gameCleared)return;
 save.ngPlus=(save.ngPlus||0)+1;save.unlocked=1;save.storyPrologue=true;save.storySeen={};save.storyFlags={};save.secretWins={};save.campaignWins={};save.storyEnding=false;
 persist();playStory("ngplus_intro",()=>openOpponent(),"NEW GAME+")
}
function showScreen(id){document.querySelectorAll(".screen").forEach(x=>x.classList.add("hidden"));document.getElementById(id).classList.remove("hidden")}
function C(id){return DB.find(c=>c.id===id)}
function isMonster(c){return c&&c.kind==="monster"}
function shuffle(a){a=[...a];for(let i=a.length-1;i;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeDeck(ids){let a=[];while(a.length<40)a.push(ids[a.length%ids.length]);return shuffle(a)}
function msg(t,d=1200){let e=document.getElementById("message");e.textContent=t;e.classList.add("show");clearTimeout(msgTimer);msgTimer=setTimeout(()=>e.classList.remove("show"),d)}
function openOpponent(){
 if(!save.storyPrologue){maybePlayPrologue();return}
 renderOpponents();showScreen("opponents")
}
function renderOpponents(){
 let map=document.getElementById("campaignMap"),info=document.getElementById("campaignInfo");
 map.innerHTML="";info.innerHTML="";
 let highest=Math.max(1,save.unlocked||1),currentStage=Math.min(highest,OPP.length);
 let current=OPP[currentStage-1]||OPP[0];
 document.getElementById("campaignRegion").textContent=current.region||"Campanha";
 document.getElementById("campaignProgress").textContent=Math.min(highest,OPP.length)+" / "+OPP.length;
 document.getElementById("campaignStars").textContent=save.stars||0;

 OPP.forEach((o,i)=>{
   let locked=i>=highest,cleared=i<Math.max(0,highest-1),current=!locked&&!cleared;
   let node=document.createElement("button");node.className="mapNode "+(o.boss?"bossNode ":"")+(locked?"locked ":"")+(cleared?"cleared ":"")+(current?"current ":"");
   node.disabled=locked;
   node.innerHTML=`<span class="nodeIcon">${locked?"🔒":o.icon}</span><span class="nodeNum">${i+1}</span>${o.boss?'<span class="bossTag">BOSS</span>':""}`;
   node.onclick=()=>{selectCampaignOpponent(i);};
   map.appendChild(node);
   if((i+1)%3===0 && i<OPP.length-1){
     let sep=document.createElement("div");sep.className="regionSep";sep.textContent="◆";map.appendChild(sep)
   }
 });
 selectCampaignOpponent(Math.min(currentStage-1,OPP.length-1),false)
}
function selectCampaignOpponent(i,scroll=true){
 let o=OPP[i],locked=i>=(save.unlocked||1),info=document.getElementById("campaignInfo");
 if(!o||!info)return;
 info.innerHTML=`<div class="campaignPortrait">${o.icon}</div><div class="campaignDetails"><b>${o.name}</b><span>${o.region} • Etapa ${o.stage}/${OPP.length}</span><small>Campo: ${o.terrain}<br>Dificuldade: ${"◆".repeat(Math.min(5,Math.ceil(o.rank/4)))}${"◇".repeat(Math.max(0,5-Math.ceil(o.rank/4)))} • Recompensa base: ★${o.stars}</small></div><button ${locked?"disabled":""} onclick="startDuel(${i})">${locked?"BLOQUEADO":"DUELAR"}</button>`;
 document.querySelectorAll(".mapNode").forEach((n,k)=>n.classList.toggle("selectedNode",k===i));
}
function openFreeDuel(){
 let list=document.getElementById("freeDuelList");list.innerHTML="";
 let max=Math.min(OPP.length,Math.max(1,save.unlocked||1));
 for(let i=0;i<max;i++){
   let o=OPP[i],b=document.createElement("button");b.className="opponentCard";
   b.innerHTML=`<div class="oppIcon">${o.icon}</div><div><div class="oppName">${o.name}</div><div class="oppMeta">${o.region||""} • Etapa ${o.stage||i+1}<br>Campo: ${o.terrain}</div></div><div class="oppStars">★</div>`;
   b.onclick=()=>startFreeDuel(i);list.appendChild(b)
 }
 showScreen("freeDuelScreen")
}
function startFreeDuel(i){
 freeDuelMode=true;beginDuel(i)
}
function openDeck(){
 renderDeck();showScreen("deckScreen");
 setTimeout(()=>document.querySelectorAll(".filterBtn").forEach(b=>b.onclick=()=>{deckFilter=b.dataset.filter;renderDeck()}),0)
}
function renderDeck(){
 document.getElementById("deckCount").textContent=save.deck.length;
 let monsters=save.deck.map(C).filter(isMonster);let avg=Math.round(monsters.reduce((s,c)=>s+c.a,0)/Math.max(1,monsters.length));
 document.getElementById("deckPower").textContent=avg;document.getElementById("starCount").textContent=save.stars;
 let counts={};save.deck.forEach(id=>counts[id]=(counts[id]||0)+1);
 let lib=document.getElementById("library");lib.innerHTML="";
 let cards=DB.filter(c=>!c.fusion);
 if(deckFilter!=="all"){
   cards=cards.filter(c=>{
     if(deckFilter==="special")return ["spell","equip","terrain"].includes(c.kind);
     return c.family===deckFilter;
   });
 }
 cards.sort((a,b)=>(a.family||"").localeCompare(b.family||"")||(b.a||0)-(a.a||0));
 cards.forEach(c=>{
  let owned=save.collection[c.id]||0,el=document.createElement("div");el.className="libCard";
  el.dataset.family=c.family||"";el.dataset.rarity=c.rarity||"N";el.style.opacity=owned?"1":".34";
  let value=isMonster(c)?`ATK ${c.a}<br>DEF ${c.d}`:c.t;
  el.innerHTML=`<button class="previewBtn" title="Ver carta">👁</button><div class="count">${counts[c.id]||0}/${Math.min(3,owned)}</div><div class="name">${c.n}</div><div class="art">${c.art}</div><div class="nums">${value}</div><div class="cardOwned">${c.rarity||"N"} • ${c.family||c.t} • COLEÇÃO ${owned}</div>`;
  el.querySelector(".previewBtn").onclick=(ev)=>{ev.stopPropagation();openCardViewer(c.id)};
  let hold=null;
  el.onpointerdown=()=>{hold=setTimeout(()=>openCardViewer(c.id),520)};
  el.onpointerup=el.onpointerleave=()=>{clearTimeout(hold)};
  el.onclick=()=>toggleDeck(c.id);lib.appendChild(el)
 })
 document.querySelectorAll(".filterBtn").forEach(b=>b.classList.toggle("active",b.dataset.filter===deckFilter));
}
function toggleDeck(id){
 let owned=save.collection[id]||0,count=save.deck.filter(x=>x===id).length,max=Math.min(3,owned);
 if(!owned)return;
 if(count<max && save.deck.length<40)save.deck.push(id);
 else if(count>0 && save.deck.length>20)save.deck.splice(save.deck.lastIndexOf(id),1);
 else if(save.deck.length===40 && count<max){
   let idx=save.deck.findIndex(x=>x!==id && save.deck.filter(y=>y===x).length>1);
   if(idx<0)idx=save.deck.findIndex(x=>x!==id);
   if(idx>=0){save.deck.splice(idx,1);save.deck.push(id)}
 }
 persist();renderDeck()
}
function resetDeck(){
 save.deck=[...STARTER_DECK];
 persist();renderDeck()
}

function openCardViewer(id){
 let c=C(id);if(!c)return;
 let v=document.getElementById("cardViewer"),card=document.getElementById("viewerCard"),info=document.getElementById("viewerInfo");
 card.dataset.family=c.family||"";card.dataset.rarity=c.rarity||"N";
 card.innerHTML=`<div class="viewerRarity">${c.rarity||"N"}</div><div class="viewerName">${c.n}</div><div class="viewerArt">${c.art}</div><div class="viewerType">${c.t}${c.g?" • "+c.g:""}${c.e?" • "+c.e:""}</div>${isMonster(c)?`<div class="viewerStats"><b>ATK ${c.a}</b><b>DEF ${c.d}</b></div>`:`<div class="viewerDesc">${c.desc||""}</div>`}`;
 let owned=save.collection[c.id]||0,inDeck=save.deck.filter(x=>x===c.id).length;
 info.innerHTML=`Família: <b>${c.family||c.t}</b><br>Raridade: <b>${c.rarity||"N"}</b><br>Possui: <b>${owned}</b> • No deck: <b>${inDeck}</b>${c.bossExclusive!==undefined?`<br><span class="exclusiveText">Carta exclusiva de chefe</span>`:""}`;
 v.classList.remove("hidden")
}
function closeCardViewer(){document.getElementById("cardViewer").classList.add("hidden")}

function openRecords(){
 document.getElementById("recordBox").innerHTML=`Vitórias: <b>${save.wins}</b><br>Derrotas: <b>${save.losses}</b><br>Estrelas: <b>${save.stars}</b><br>Melhor ranking: <b>${save.bestRank||"-"}</b><br>Duelistas liberados: <b>${save.unlocked}/${OPP.length}</b><br>Cartas diferentes: <b>${Object.values(save.collection).filter(v=>v>0).length}/${DB.filter(c=>!c.fusion).length}</b><br><br><span style="color:#918597">O progresso e a coleção são salvos automaticamente no aparelho.</span>`;
 showScreen("records")
}
function newSave(){if(confirm("Apagar progresso e começar de novo?")){localStorage.removeItem("fdm_save");location.reload()}}


function startDuel(i){freeDuelMode=false;
 let o=OPP[i],regionIdx=Math.floor(i/3),regionKey="region_"+regionIdx,bossKey="boss_"+i;
 let seen=save.storySeen||(save.storySeen={});
 let launch=()=>beginDuel(i);

 // evento secreto do desfiladeiro antes da etapa 2
 if(i===1 && save.storyFlags.path_secret && !save.secretWins.canyon){
   playStory("secret_canyon",()=>startSecretDuel("canyon"),"EVENTO SECRETO");return
 }
 // escolha especial no oceano
 if(i===9 && !save.storyFlags.ocean_destroy && !save.storyFlags.ocean_preserve){
   playStory("choice_3",()=>{ if(save.storyFlags.ocean_preserve&&!save.secretWins.ocean){playStory("secret_ocean",()=>grantOceanSecret(),"PASSAGEM SUBMERSA")}else launch() },"DECISÃO NO OCEANO");return
 }
 if(o.boss && STORY[bossKey] && !seen[bossKey]){
   playStory(bossKey,()=>{seen[bossKey]=true;persist();launch()},o.region);return
 }
 if(i%3===0 && STORY[regionKey] && !seen[regionKey]){
   playStory(regionKey,()=>{seen[regionKey]=true;persist();launch()},o.region);return
 }
 launch()
}

function startSecretDuel(type){
 let secret={
  canyon:{name:"Duelista Errante",icon:"🦂",rank:8,stars:5,ai:.72,terrain:"Desfiladeiro",bonus:["Trevas","Terra"],deck:[45,51,60,61,62,33,34,37,302,311,312,324]},
 }[type];
 if(!secret)return;
 freeDuelMode=false;currentOpponent=-1;
 let pdeck=makeDeck(save.deck.length?save.deck:[1,2,3,4,5]),edeck=makeDeck(secret.deck);
 S={pLP:8000,eLP:8000,pDeck:pdeck,eDeck:edeck,pHand:[],eHand:[],pField:Array(5).fill(null),eField:Array(5).fill(null),turn:1,side:"p",selectedHand:null,selectedField:null,target:null,attacked:new Set(),summoned:false,over:false,terrain:secret.terrain,terrainBonus:secret.bonus,secretType:type,enemyProfile:secret,stats:{dealt:0,taken:0,fusions:0,destroyed:0,direct:0,spells:0,equips:0}};
 for(let k=0;k<5;k++){draw("p");draw("e")}
 document.getElementById("enemyName").textContent=secret.name;document.getElementById("enemyPortrait").textContent=secret.icon;
 fusionMode=false;fusionSel=[];attackMode=false;shownPLP=8000;shownELP=8000;showScreen("duel");renderAll();msg("DUELO SECRETO!",900)
}
function grantOceanSecret(){
 let reward=DB.find(c=>c.rarity==="UR"&&c.family==="aquatico"&&!c.fusion)||DB.find(c=>c.family==="aquatico"&&!c.fusion);
 if(reward){save.collection[reward.id]=(save.collection[reward.id]||0)+1;save.secretWins.ocean=true;persist();msg("Carta secreta obtida: "+reward.n,1500)}
 openOpponent()
}
function beginDuel(i){
 currentOpponent=i;let o=OPP[i];if(o.boss)playSfx("boss");
 let ng=save.ngPlus||0;
 let pdeck=makeDeck(save.deck.length?save.deck:[1,2,3,4,5]);
 let edeck=makeDeck(o.deck);
 S={pLP:8000,eLP:8000,pDeck:pdeck,eDeck:edeck,pHand:[],eHand:[],pField:Array(5).fill(null),eField:Array(5).fill(null),
 turn:1,side:"p",selectedHand:null,selectedField:null,target:null,attacked:new Set(),summoned:false,over:false,
 terrain:o.terrain,terrainBonus:o.bonus,enemyProfile:o,stats:{dealt:0,taken:0,fusions:0,destroyed:0,direct:0,spells:0,equips:0}};
 for(let k=0;k<5;k++){draw("p");draw("e")}
 document.getElementById("enemyName").textContent=o.name;document.getElementById("enemyPortrait").textContent=o.icon;
 fusionMode=false;fusionSel=[];attackMode=false;shownPLP=8000;shownELP=8000;showScreen("duel");renderAll();msg("DUEL START!",900)
}
function draw(side){
 let d=side==="p"?S.pDeck:S.eDeck,h=side==="p"?S.pHand:S.eHand;
 if(d.length&&h.length<5)h.push(d.pop())
}
function renderAll(){renderHUD();renderZone("p");renderZone("e");renderHand();renderButtons()}
let shownPLP=8000,shownELP=8000,lpAnimP=null,lpAnimE=null;
function tweenLP(side,target){
 let key=side==="player"?"shownPLP":"shownELP",current=side==="player"?shownPLP:shownELP;
 if(Math.round(current)===Math.round(target)){
   document.getElementById(side+"LP").textContent=Math.max(0,Math.round(target));return;
 }
 let start=current,delta=target-start,t0=performance.now();
 function frame(now){
   let p=Math.min(1,(now-t0)/420),ease=1-Math.pow(1-p,3),v=start+delta*ease;
   if(side==="player")shownPLP=v;else shownELP=v;
   document.getElementById(side+"LP").textContent=Math.max(0,Math.round(v));
   let f=document.getElementById(side+"LPFill");f.style.width=Math.max(0,v/80)+"%";f.classList.toggle("low",v<2400);
   if(p<1)requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame)
}
function renderHUD(){
 tweenLP("player",S.pLP);tweenLP("enemy",S.eLP);
 document.getElementById("turnLabel").textContent="TURNO "+S.turn;
 let ft=document.getElementById("fieldText");ft.textContent="★ "+S.terrain.toUpperCase()+" ★";ft.classList.add("terrainPulse");
 document.getElementById("phaseLabel").textContent=S.side==="p"?(attackMode?"BATTLE PHASE":"MAIN PHASE"):"TURNO DO OPONENTE";applyTerrainVisual()
}
function renderZone(side){
 let zone=document.getElementById(side==="p"?"playerZone":"enemyZone"),field=side==="p"?S.pField:S.eField;zone.innerHTML="";
 field.forEach((x,i)=>{
  let slot=document.createElement("div");slot.className="slot";
  if(x){let c=C(x.id),card=document.createElement("div");card.className="boardCard "+(x.pos==="def"?"defense ":"")+(x.faceDown?"facedown ":"");
   card.dataset.kind="monster";card.dataset.family=c.family||"";card.dataset.guardian=c.g||"";card.dataset.rarity=c.rarity||"N";
   if(side==="p"&&S.selectedField===i)card.classList.add("selected");
   if(side==="e"&&attackMode&&S.selectedField!==null)card.classList.add("targetable");
   let atk=battleATK(c,x),def=battleDEF(c,x),eq=(x.equipNames||[]).join(" + ");
   card.innerHTML=`<div class="rarity">${c.rarity||"N"}</div><div class="cname">${c.n}</div><div class="cart"><span>${c.art}</span><i>${c.family||c.t}</i></div><div class="cmeta"><span>${c.t}</span><span>${c.e}</span></div><div class="guardian">${c.g}</div>${eq?`<div class="equipTag">⚙ ${eq}</div>`:""}<div class="cnums">A ${atk} / D ${def}</div>`;
   card.onclick=()=>fieldTap(side,i);slot.appendChild(card)
  }
  zone.appendChild(slot)
 })
}
function renderHand(){
 let h=document.getElementById("hand");h.innerHTML="";
 S.pHand.forEach((id,i)=>{let c=C(id),el=document.createElement("div");el.className="boardCard handCard";el.dataset.kind=c.kind||"monster";el.dataset.family=c.family||"";el.dataset.guardian=c.g||"";el.dataset.rarity=c.rarity||"N";
  if(S.selectedHand===i||fusionSel.includes(i))el.classList.add("selected");
  if(isMonster(c)){
    el.innerHTML=`<div class="rarity">${c.rarity||"N"}</div><div class="cname">${c.n}</div><div class="cart"><span>${c.art}</span><i>${c.family||c.t}</i></div><div class="cmeta"><span>${c.t}</span><span>${c.g}</span></div><div class="cnums">A ${c.a} / D ${c.d}</div>`;
  }else{
    el.innerHTML=`<div class="rarity">${c.rarity||"N"}</div><div class="cname">${c.n}</div><div class="cart"><span>${c.art}</span><i>${c.family||c.t}</i></div><div class="cmeta"><span>${c.t}</span><span>${c.e||""}</span></div><div class="effectDesc">${c.desc||""}</div>`;
  }
  el.onclick=()=>handTap(i);h.appendChild(el)
 })
}
function renderButtons(){
 let mine=S.side==="p"&&!S.over,c=S.selectedHand!==null?C(S.pHand[S.selectedHand]):null;
 let needsSlot=!c||isMonster(c);
 document.getElementById("btnPlay").disabled=!mine||(!fusionMode&&S.selectedHand===null)||S.summoned||(needsSlot&&freeSlot(S.pField)<0);
 document.getElementById("btnFusion").disabled=!mine||S.summoned;
 document.getElementById("btnAttack").disabled=!mine||S.selectedField===null;
 document.getElementById("btnFlip").disabled=!mine||S.selectedField===null;
 document.getElementById("btnEnd").disabled=!mine;
 let tray=document.getElementById("fusionTray");tray.classList.toggle("hidden",!fusionMode);
 tray.innerHTML=fusionSel.map(i=>`<span class="fusionChip">${C(S.pHand[i]).n}</span>`).join("<span>＋</span>")
}
function handTap(i){
 if(S.side!=="p"||S.over)return;
 if(fusionMode){
  if(!isMonster(C(S.pHand[i])))return msg("Somente monstros entram na fusão.");
  let p=fusionSel.indexOf(i);if(p>=0)fusionSel.splice(p,1);else if(fusionSel.length<5)fusionSel.push(i);
 } else {S.selectedHand=S.selectedHand===i?null:i;S.selectedField=null;attackMode=false}
 renderAll()
}
function fieldTap(side,i){
 if(S.side!=="p"||S.over)return;
 if(side==="p"){
  if(S.pField[i]){S.selectedField=S.selectedField===i?null:i;S.selectedHand=null;attackMode=false;renderAll()}
 } else if(attackMode&&S.selectedField!==null&&S.eField[i]) resolveAttack(S.selectedField,i)
}
function freeSlot(field){return field.findIndex(x=>!x)}
function playSelection(){
 if(S.summoned)return msg("Você já jogou uma carta neste turno.");
 if(fusionMode){
  if(!fusionSel.length)return msg("Selecione cartas para a fusão.");
  let ids=fusionSel.map(i=>S.pHand[i]);let result=chainFusion(ids);
  let rm=[...fusionSel].sort((a,b)=>b-a);rm.forEach(i=>S.pHand.splice(i,1));
  if(result){S.pHand.push(result);S.stats.fusions++;playSfx("fusion");playFusionCinematic(ids,result);msg("FUSÃO COMPLETA: "+C(result).n,1400)}
  else {let strongest=ids.sort((a,b)=>(C(b).a+C(b).d)-(C(a).a+C(a).d))[0];S.pHand.push(strongest);msg("Fusão falhou. A combinação se desfez.",1400)}
  fusionSel=[];fusionMode=false;S.selectedHand=S.pHand.length-1;renderAll();return
 }
 if(S.selectedHand===null)return;
 let idx=S.selectedHand,id=S.pHand[idx],card=C(id);
 if(!isMonster(card)){playMagicCard(idx);return}
 openPositionChoice(id,idx)
}
function openPositionChoice(id,idx){
 let c=C(id);let box=document.getElementById("choice"),buttons=document.getElementById("choiceButtons");
 document.getElementById("choiceTitle").textContent=c.n;document.getElementById("choiceText").textContent="Escolha posição e visibilidade.";
 buttons.innerHTML="";
 [["ATK ABERTO","atk",false],["DEF ABERTO","def",false],["DEF VIRADO","def",true]].forEach(([txt,pos,fd])=>{
  let b=document.createElement("button");b.className="bigChoice";b.innerHTML=`<b>${txt}</b>${pos==="atk"?"Usa ATK na batalha":"Usa DEF ao ser atacado"}`;
  b.onclick=()=>{box.classList.add("hidden");summonFromHand(idx,pos,fd)};buttons.appendChild(b)
 });
 let cancel=document.createElement("button");cancel.className="bigChoice";cancel.innerHTML="<b>CANCELAR</b>Voltar ao campo";cancel.onclick=()=>box.classList.add("hidden");buttons.appendChild(cancel);
 box.classList.remove("hidden")
}
function summonFromHand(idx,pos,faceDown){
 let s=freeSlot(S.pField);if(s<0)return;
 let id=S.pHand.splice(idx,1)[0];S.pField[s]={id,pos,faceDown,atkBonus:0,defBonus:0,equipNames:[]};S.summoned=true;S.selectedHand=null;S.selectedField=s;
 playSfx("summon");playSummonCinematic(C(id),S.pField[s]);msg(C(id).n+" foi colocado no campo.",1100);renderAll()
}
function toggleFusionMode(){fusionMode=!fusionMode;fusionSel=[];S.selectedHand=null;renderAll();if(fusionMode)msg("FUSÃO: selecione de 2 a 5 cartas.",1000)}
function chainFusion(ids){
 if(ids.length<2)return null;
 let cur=ids[0],made=false;
 for(let i=1;i<ids.length;i++){let r=findFusion(cur,ids[i]);if(r){cur=r;made=true}else if(made){let alt=findFusion(cur,ids[i]);if(alt)cur=alt}}
 return made?cur:null
}
function findFusion(a,b){let f=FUS.find(x=>(x[0][0]===a&&x[0][1]===b)||(x[0][0]===b&&x[0][1]===a));return f?f[1]:null}
function beginAttack(){
 if(S.selectedField===null||!S.pField[S.selectedField])return;
 let u=S.pField[S.selectedField];if(u.pos!=="atk")return msg("Mude a carta para posição de ataque.");
 if(S.attacked.has(S.selectedField))return msg("Essa carta já atacou neste turno.");
 attackMode=true;renderAll();
 if(S.eField.every(x=>!x))directAttack("p",S.selectedField);else msg("Escolha uma carta inimiga.",900)
}
function guardianBonus(att,def){
 let rel=(GREL[att.g]||{})[def.g]||0;return rel*500
}
function terrainBonus(card){
 if(!S||!S.terrainBonus)return 0;
 return (S.terrainBonus.includes(card.e)||S.terrainBonus.includes(card.t))?300:0
}
function battleATK(card,unit=null){return (card.a||0)+terrainBonus(card)+(unit?.atkBonus||0)}
function battleDEF(card,unit=null){return (card.d||0)+terrainBonus(card)+(unit?.defBonus||0)}
function resolveAttack(ai,di){
 let A=S.pField[ai],D=S.eField[di],ac=C(A.id),dc=C(D.id);
 attackMode=false;playSfx("attack");playSfx("attack");playBattleCinematic(ac,dc,A,D);let atk=battleATK(ac,A)+guardianBonus(ac,dc),defPower=D.pos==="atk"?battleATK(dc,D):battleDEF(dc,D);
 S.attacked.add(ai);
 animateBoard("playerZone","attackAnim");
 setTimeout(()=>{
  if(D.faceDown){D.faceDown=false;renderAll()}
  let diff=atk-defPower;
  if(D.pos==="atk"){
   if(diff>0){S.eLP-=diff;S.stats.dealt+=diff;S.stats.destroyed++;destructionFX("e",di,"✹");S.eField[di]=null;msg(`${ac.n} destruiu ${dc.n}! -${diff} LP`,1300)}
   else if(diff<0){S.pLP-=Math.abs(diff);S.stats.taken+=Math.abs(diff);destructionFX("p",ai,"✹");S.pField[ai]=null;msg(`${ac.n} foi destruído! -${Math.abs(diff)} LP`,1300)}
   else {destructionFX("e",di,"✹");destructionFX("p",ai,"✹");S.eField[di]=null;S.pField[ai]=null;msg("Empate! As duas cartas foram destruídas.",1300)}
  }else{
   if(diff>0){destructionFX("e",di,"✹");S.eField[di]=null;S.stats.destroyed++;msg(`${dc.n} foi destruído em defesa.`,1100)}
   else if(diff<0){S.pLP-=Math.abs(diff);S.stats.taken+=Math.abs(diff);msg(`Defesa resistiu! -${Math.abs(diff)} LP`,1100)}
   else msg("Ataque bloqueado.",900)
  }
  S.selectedField=null;renderAll();checkOver()
 },300)
}
function directAttack(side,idx){
 if(side==="p"){let u=S.pField[idx],c=C(u.id),dmg=battleATK(c,u);S.eLP-=dmg;S.stats.dealt+=dmg;S.stats.direct++;S.attacked.add(idx);msg(`ATAQUE DIRETO! -${dmg} LP`,1100)}
 else {let u=S.eField[idx],c=C(u.id),dmg=battleATK(c,u);S.pLP-=dmg;S.stats.taken+=dmg;msg(`ATAQUE DIRETO INIMIGO! -${dmg} LP`,1100)}
 attackMode=false;renderAll();checkOver()
}
function changePosition(){
 let i=S.selectedField,u=S.pField[i];if(!u)return;
 u.pos=u.pos==="atk"?"def":"atk";u.faceDown=false;msg("Posição alterada.",700);renderAll()
}
function endTurn(){
 if(S.side!=="p")return;fusionMode=false;fusionSel=[];attackMode=false;S.selectedField=null;S.selectedHand=null;S.side="e";renderAll();setTimeout(aiTurn,550)
}

function bossBehavior(){
 let o=S?.enemyProfile||OPP[currentOpponent];if(!o||!o.boss)return;
 let phase=Math.floor((S.eLP/8000)*3);
 if(o.stage===18 && S.eLP<3000 && !S.bossPowerUsed){
   S.bossPowerUsed=true;S.eLP=Math.min(8000,S.eLP+700);msg("O Faraó recuperou 700 LP com a Memória Antiga!",1100);playSfx("boss")
 }
 if(o.region==="Santuário Sombrio" && S.eLP<4500 && !S.shadowBoost){
   S.shadowBoost=true;S.eField.forEach(u=>{if(u){u.atkBonus=(u.atkBonus||0)+300;u.defBonus=(u.defBonus||0)+300}});
   msg("CHEFE: as sombras fortalecem todo o campo inimigo!",1100)
 }
 if(o.region==="Montanhas do Trovão" && !S.thunderUsed && S.turn>=4){
   S.thunderUsed=true;S.pLP=Math.max(0,S.pLP-400);S.stats.taken+=400;msg("CHEFE: relâmpago do pico! -400 LP",1000);playSfx("magic")
 }
 if(o.region==="Oceano" && S.eField.filter(Boolean).length<2 && S.turn>=5 && !S.oceanUsed){
   S.oceanUsed=true;let candidate=S.eHand.findIndex(id=>isMonster(C(id)));
   if(candidate>=0 && freeSlot(S.eField)>=0){
     let id=S.eHand.splice(candidate,1)[0],slot=freeSlot(S.eField);S.eField[slot]={id,pos:"def",faceDown:false,atkBonus:200,defBonus:400,equipNames:[]};
     msg("CHEFE: o oceano invocou um guardião em defesa!",1000)
   }
 }
}

async function aiTurn(){
 if(S.over)return;draw("e");let o=S.enemyProfile||OPP[currentOpponent];bossBehavior();renderAll();checkOver();if(S.over)return;
 // fusion in hand
 let fused=bestAIFusion();
 if(fused)msg("Oponente realizou uma fusão!",800);
 await wait(500);
 // summon
 if(freeSlot(S.eField)>=0&&S.eHand.length){
  let opts=S.eHand.map((id,i)=>({id,i,c:C(id)})).filter(x=>isMonster(x.c)).map(x=>({...x,p:x.c.a+x.c.d}));
  let best=opts.sort((a,b)=>b.p-a.p)[0];
  if(!best){await aiUseMagic();best=null}
  if(!best){/* sem monstro */}
  if(best){
   let id=S.eHand.splice(best.i,1)[0],slot=freeSlot(S.eField);
   let defensive=Math.random()>o.ai&&C(id).d>C(id).a;
   S.eField[slot]={id,pos:defensive?"def":"atk",faceDown:defensive&&Math.random()<.5,atkBonus:(save.ngPlus||0)*180,defBonus:(save.ngPlus||0)*180,equipNames:[]};
   playSfx("summon");playSummonCinematic(C(id),S.eField[slot],true);msg(o.name+" jogou uma carta.",850);renderAll();await wait(650)
  }
 }
 await aiUseMagic();
 // attack each attacker once
 for(let i=0;i<5&&!S.over;i++){
  let u=S.eField[i];if(!u||u.pos!=="atk")continue;
  let targets=S.pField.map((x,k)=>x?{x,k}:null).filter(Boolean);
  if(!targets.length){directAttack("e",i);await wait(600);continue}
  let target=targets.sort((A,B)=>effectiveDefense(A.x)-effectiveDefense(B.x))[0];
  aiResolveAttack(i,target.k);await wait(720)
 }
 if(S.over)return;
 S.turn++;S.side="p";S.summoned=false;S.attacked=new Set();draw("p");renderAll();msg("SEU TURNO",700)
}
function effectiveDefense(u){let c=C(u.id);return u.pos==="atk"?battleATK(c,u):battleDEF(c,u)}
function bestAIFusion(){
 for(let i=0;i<S.eHand.length;i++)for(let j=i+1;j<S.eHand.length;j++){if(!isMonster(C(S.eHand[i]))||!isMonster(C(S.eHand[j])))continue;let r=findFusion(S.eHand[i],S.eHand[j]);if(r){
  S.eHand.splice(j,1);S.eHand.splice(i,1);S.eHand.push(r);return true}}
 return false
}
function aiResolveAttack(ai,di){
 let A=S.eField[ai],D=S.pField[di],ac=C(A.id),dc=C(D.id);
 playSfx("attack");playBattleCinematic(ac,dc,A,D);let atk=battleATK(ac,A)+guardianBonus(ac,dc),dp=D.pos==="atk"?battleATK(dc,D):battleDEF(dc,D),diff=atk-dp;
 if(D.faceDown)D.faceDown=false;
 if(D.pos==="atk"){
  if(diff>0){S.pLP-=diff;S.stats.taken+=diff;destructionFX("p",di,"✹");S.pField[di]=null;msg(`${ac.n} venceu! -${diff} LP`,900)}
  else if(diff<0){S.eLP-=Math.abs(diff);S.stats.dealt+=Math.abs(diff);S.stats.destroyed++;destructionFX("e",ai,"✹");S.eField[ai]=null;msg("Seu monstro contra-atacou!",900)}
  else {S.eField[ai]=null;S.pField[di]=null;msg("As cartas se destruíram!",800)}
 }else{
  if(diff>0){S.pField[di]=null;msg("Sua defesa foi destruída.",850)}
  else if(diff<0){S.eLP-=Math.abs(diff);S.stats.dealt+=Math.abs(diff);msg("Sua defesa causou dano!",850)}
 }
 renderAll();checkOver()
}


function destructionFX(side,index,emoji="✦"){playSfx("destroy");
 let zone=document.getElementById(side==="p"?"playerZone":"enemyZone");
 let cards=zone.querySelectorAll(".boardCard"),el=cards[index];
 if(!el)return;
 let r=el.getBoundingClientRect(),ghost=el.cloneNode(true);
 ghost.className="destroyGhost destroyFX";
 ghost.style.left=r.left+"px";ghost.style.top=r.top+"px";ghost.style.width=r.width+"px";ghost.style.height=r.height+"px";
 let burst=document.createElement("div");burst.className="destroyBurst";burst.textContent=emoji;ghost.appendChild(burst);
 document.body.appendChild(ghost);setTimeout(()=>ghost.remove(),650)
}

function removeHandCard(idx){let id=S.pHand.splice(idx,1)[0];S.selectedHand=null;return C(id)}
function playMagicCard(idx){
 let card=C(S.pHand[idx]);
 if(card.kind==="terrain"){
   playSfx("magic");removeHandCard(idx);S.terrain=card.terrain;S.terrainBonus=[...card.bonus];S.stats.spells++;
   document.getElementById("board").classList.add("magicBurst");setTimeout(()=>document.getElementById("board").classList.remove("magicBurst"),600);
   msg("CAMPO ALTERADO: "+card.terrain.toUpperCase(),1300);renderAll();return
 }
 if(card.kind==="spell"){
   playSfx("magic");removeHandCard(idx);S.stats.spells++;
   if(card.effect==="draw2"){draw("p");draw("p");msg("VISÃO ANCESTRAL: você comprou cartas.",1200)}
   if(card.effect==="burn500"){S.eLP=Math.max(0,S.eLP-500);S.stats.dealt+=500;msg("RUPTURA ESPIRITUAL: -500 LP",1200)}
   if(card.effect==="burn800"){S.eLP=Math.max(0,S.eLP-800);S.stats.dealt+=800;msg("CHAMA DO DESTINO: -800 LP",1200)}
   document.getElementById("board").classList.add("magicBurst");setTimeout(()=>document.getElementById("board").classList.remove("magicBurst"),600);
   renderAll();checkOver();return
 }
 if(card.kind==="equip"){playSfx("magic");openEquipChoice(idx,card);return}
}
function openEquipChoice(idx,card){
 let valid=S.pField.map((u,i)=>u?{u,i,c:C(u.id)}:null).filter(Boolean).filter(x=>card.target==="monster"||x.c.t===card.target);
 if(!valid.length)return msg("Nenhum monstro compatível para equipar.");
 let box=document.getElementById("choice"),buttons=document.getElementById("choiceButtons");
 document.getElementById("choiceTitle").textContent=card.n;
 document.getElementById("choiceText").textContent=card.desc+" Escolha o alvo.";
 buttons.innerHTML="";
 valid.forEach(x=>{
   let b=document.createElement("button");b.className="bigChoice";b.innerHTML=`<b>${x.c.n}</b>ATK ${battleATK(x.c,x.u)} / DEF ${battleDEF(x.c,x.u)}`;
   b.onclick=()=>{box.classList.add("hidden");equipCard(idx,x.i,card)};buttons.appendChild(b)
 });
 let cancel=document.createElement("button");cancel.className="bigChoice";cancel.innerHTML="<b>CANCELAR</b>Voltar";cancel.onclick=()=>box.classList.add("hidden");buttons.appendChild(cancel);
 box.classList.remove("hidden")
}
function equipCard(handIdx,fieldIdx,card){
 let u=S.pField[fieldIdx];if(!u)return;
 S.pHand.splice(handIdx,1);S.selectedHand=null;u.atkBonus=(u.atkBonus||0)+(card.atkBonus||0);u.defBonus=(u.defBonus||0)+(card.defBonus||0);
 (u.equipNames||(u.equipNames=[])).push(card.n);S.stats.equips++;msg(card.n+" equipado em "+C(u.id).n+".",1200);renderAll()
}
async function aiUseMagic(){
 let terrainIdx=S.eHand.findIndex(id=>C(id)?.kind==="terrain");
 if(terrainIdx>=0&&Math.random()<.35){
   let c=C(S.eHand.splice(terrainIdx,1)[0]);S.terrain=c.terrain;S.terrainBonus=[...c.bonus];msg("Oponente mudou o terreno para "+c.terrain+".",900);renderAll();await wait(450)
 }
 let spellIdx=S.eHand.findIndex(id=>C(id)?.kind==="spell");
 if(spellIdx>=0&&Math.random()<.45){
   let c=C(S.eHand.splice(spellIdx,1)[0]);
   if(c.effect==="draw2"){draw("e");draw("e")}
   if(c.effect==="burn500"){S.pLP=Math.max(0,S.pLP-500);S.stats.taken+=500}
   if(c.effect==="burn800"){S.pLP=Math.max(0,S.pLP-800);S.stats.taken+=800}
   msg("Oponente ativou "+c.n+".",900);renderAll();checkOver();await wait(450)
 }
 let equipIdx=S.eHand.findIndex(id=>C(id)?.kind==="equip");
 if(equipIdx>=0){
   let ec=C(S.eHand[equipIdx]);let targets=S.eField.map((u,i)=>u?{u,i,c:C(u.id)}:null).filter(Boolean).filter(x=>ec.target==="monster"||x.c.t===ec.target);
   if(targets.length){
     let t=targets.sort((a,b)=>battleATK(b.c,b.u)-battleATK(a.c,a.u))[0];S.eHand.splice(equipIdx,1);
     t.u.atkBonus=(t.u.atkBonus||0)+(ec.atkBonus||0);t.u.defBonus=(t.u.defBonus||0)+(ec.defBonus||0);(t.u.equipNames||(t.u.equipNames=[])).push(ec.n);
     msg("Oponente equipou "+ec.n+".",800);renderAll();await wait(350)
   }
 }
}
function cineCardHTML(c,unit=null){
 if(!c)return "";
 let stats=isMonster(c)?`<div>ATK ${battleATK(c,unit)} / DEF ${battleDEF(c,unit)}</div>`:`<div>${c.t}</div>`;
 return `<div class="cineAura"></div><div class="bigArt">${c.art}</div><b>${c.n}</b><small>${c.t} • ${c.g}</small>${stats}`
}

function familyFx(c){
 let map={dragao:"🔥",passaro:"💨",mago:"✨",aquatico:"💧",trevas:"🌑",fogo:"🔥",maquina:"⚙️",pedra:"🪨",sol:"☀️",lua:"🌙",fada:"⭐",guerreiro:"⚔️"};
 return map[c.family]||"✦"
}
function applyTerrainVisual(){
 let board=document.getElementById("board");if(!board||!S)return;
 board.dataset.terrain=(S.terrain||"neutral").toLowerCase().replace(/\s+/g,"-");
}
function playSummonCinematic(c,u,enemy=false){
 let fx=familyFx(c),el=document.getElementById("cinematic");
 el.className="cinematic summon summon-"+(c.family||"generic");
 document.getElementById("cineLabel").textContent=enemy?"ENEMY SUMMON":"SUMMON";
 document.getElementById("cineLeft").innerHTML="";
 document.getElementById("cineRight").innerHTML=cineCardHTML(c,u);
 document.getElementById("cineFx").textContent=fx;
 document.getElementById("cineText").textContent=c.n+" entra no campo!";
 el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),720)
}

function showCinematic(type,left,right,text,ms=850){
 let el=document.getElementById("cinematic");el.className="cinematic "+type;
 document.getElementById("cineLabel").textContent=type==="fusion"?"FUSION":"BATTLE";
 document.getElementById("cineLeft").innerHTML=left||"";
 document.getElementById("cineRight").innerHTML=right||"";
 document.getElementById("cineLeft").className="cineCard cineLeft";document.getElementById("cineRight").className="cineCard cineRight";
 document.getElementById("cineFx").textContent=type==="fusion"?"✦":"⚔";
 document.getElementById("cineText").textContent=text||"";
 el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),ms)
}
function playFusionCinematic(ids,result){
 let first=C(ids[0]),last=C(ids[ids.length-1]),r=C(result);
 showCinematic("fusion",cineCardHTML(first),cineCardHTML(last),first.n+" + "+last.n+" → "+r.n,1050);
 setTimeout(()=>{document.getElementById("cineLeft").innerHTML=cineCardHTML(r);document.getElementById("cineRight").innerHTML=cineCardHTML(r)},480)
}
function playBattleCinematic(ac,dc,A,D){
 showCinematic("battle",cineCardHTML(ac,A),cineCardHTML(dc,D),ac.n+" VS "+dc.n,720)
}

function animateBoard(id,cl){let e=document.getElementById(id);e.classList.add(cl);setTimeout(()=>e.classList.remove(cl),430)}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function checkOver(){
 if(S.pLP<=0){S.pLP=0;finish(false)}
 else if(S.eLP<=0){S.eLP=0;finish(true)}
}
function duelRank(win){
 if(!win)return "D";
 let score=1000;
 score+=Math.max(0,500-S.turn*35);
 score+=S.stats.fusions*130+S.stats.destroyed*90+S.stats.direct*60;
 score+=Math.floor(Math.max(0,S.pLP)/20);
 score-=Math.floor(S.stats.taken/18);
 if(score>=1800)return "S";
 if(score>=1450)return "A";
 if(score>=1150)return "B";
 if(score>=850)return "C";
 return "D"
}
function rankValue(r){return {S:5,A:4,B:3,C:2,D:1}[r]||0}
function rewardCard(rank){
 let pool=DB.filter(c=>!c.fusion&&c.bossExclusive===undefined);
 let w={
   S:{UR:30,SR:40,R:25,N:5},
   A:{UR:15,SR:35,R:35,N:15},
   B:{UR:5,SR:25,R:40,N:30},
   C:{UR:1,SR:14,R:35,N:50},
   D:{UR:0,SR:5,R:25,N:70}
 }[rank]||{UR:0,SR:5,R:25,N:70};
 let roll=Math.random()*100,acc=0,wanted="N";
 for(const rarity of ["UR","SR","R","N"]){
   acc+=w[rarity];
   if(roll<acc){wanted=rarity;break}
 }
 let preferred=pool.filter(c=>(c.rarity||"N")===wanted);
 if(!preferred.length)preferred=pool;
 return preferred[Math.floor(Math.random()*preferred.length)]
}
function finish(win){
 if(S.over)return;S.over=true;renderAll();
 let rank=duelRank(win),badge=document.getElementById("rankBadge"),area=document.getElementById("rewardArea");
 badge.textContent=rank;area.innerHTML="";

 // duelo secreto
 if(S.secretType){
   if(win){
     save.secretWins[S.secretType]=true;
     let secretReward=DB.find(c=>c.rarity==="UR"&&!c.fusion&&c.bossExclusive===undefined)||rewardCard("S");
     save.collection[secretReward.id]=(save.collection[secretReward.id]||0)+1;save.stars+=5;persist();
     document.getElementById("resultTitle").textContent="SEGREDO DESCOBERTO";
     document.getElementById("resultText").innerHTML=`Você venceu o Duelista Errante.<br>★ 5 estrelas • Carta secreta obtida`;
     area.innerHTML=`<div class="rewardCard bossReward"><div class="rName">CARTA SECRETA</div><div class="rArt">${secretReward.art}</div><div class="rName">${secretReward.n}</div><div class="rStats">ATK ${secretReward.a||0} / DEF ${secretReward.d||0}</div></div>`;
   }else{
     document.getElementById("resultTitle").textContent="DERROTA";
     document.getElementById("resultText").textContent="O evento secreto continua escondido. Você pode tentar novamente.";
   }
   setTimeout(()=>document.getElementById("resultModal").classList.remove("hidden"),700);return
 }

 let o=OPP[currentOpponent];
 if(win){
  let base=freeDuelMode?Math.max(1,Math.floor(o.stars/2)):o.stars,bonus=rankValue(rank)-1,reward=base+Math.max(0,bonus);
  let bossId=o.bossReward,bossCard=bossId?C(bossId):null,firstBossReward=!freeDuelMode&&!!(bossId&&bossCard&&(save.collection[bossId]||0)===0);
  let card=firstBossReward?bossCard:rewardCard(rank);
  save.wins++;save.stars+=reward;
  if(!freeDuelMode){
    save.campaignWins[currentOpponent]=(save.campaignWins[currentOpponent]||0)+1;
    save.unlocked=Math.max(save.unlocked,Math.min(OPP.length,currentOpponent+2));
  }
  save.collection[card.id]=(save.collection[card.id]||0)+1;
  if(rankValue(rank)>rankValue(save.bestRank))save.bestRank=rank;
  if(!freeDuelMode && currentOpponent===OPP.length-1){save.gameCleared=true}
  persist();
  document.getElementById("resultTitle").textContent=freeDuelMode?"VITÓRIA — DUELO LIVRE":"VITÓRIA";
  document.getElementById("resultText").innerHTML=`Você venceu <b>${o.name}</b> em ${S.turn} turnos.<br>★ ${reward} estrelas • Ranking ${rank} • ${S.stats.fusions} fusões • ${S.stats.destroyed} destruídos`;
  area.innerHTML=`<div class="rewardCard ${firstBossReward?"bossReward":""}"><div class="rName">${firstBossReward?"RECOMPENSA EXCLUSIVA":"CARTA OBTIDA"}</div><div class="rArt">${card.art}</div><div class="rName">${card.n}</div><div class="rStats">${isMonster(card)?`ATK ${card.a} / DEF ${card.d}`:card.t}</div></div>`;
  if(!freeDuelMode && currentOpponent===OPP.length-1 && !save.storyEnding){
    save.storyEnding=true;persist();setTimeout(()=>playStory("ending",null,"EPÍLOGO"),1500)
  }
 }else{
  save.losses++;persist();
  document.getElementById("resultTitle").textContent="DERROTA";
  document.getElementById("resultText").textContent="O duelo terminou. Ajuste seu deck e tente novamente.";
  area.innerHTML="<div style='font-size:10px;color:#8f8494;text-align:center;margin:8px'>Nenhuma recompensa nesta partida.</div>"
 }
 setTimeout(()=>document.getElementById("resultModal").classList.remove("hidden"),700)
}
function hideResult(){document.getElementById("resultModal").classList.add("hidden")}
function returnAfterDuel(){hideResult();if(freeDuelMode)openFreeDuel();else openOpponent()}

// Controles de teclado para PC (mantém toque no celular)
document.addEventListener("keydown",(ev)=>{
  if(document.getElementById("duel").classList.contains("hidden") || !S || S.over) return;
  if(!document.getElementById("choice").classList.contains("hidden")){
    if(ev.key==="Escape") document.getElementById("choice").classList.add("hidden");
    return;
  }
  const k=ev.key.toLowerCase();
  if(["1","2","3","4","5"].includes(k)){
    const i=Number(k)-1;if(i<S.pHand.length) handTap(i);
  } else if(k==="a") beginAttack();
  else if(k==="f") toggleFusionMode();
  else if(k==="p") changePosition();
  else if(k==="e" || ev.key==="Enter") endTurn();
  else if(k==="j") playSelection();
});

renderOpponents();

setTimeout(updateNGPlusButton,0);
