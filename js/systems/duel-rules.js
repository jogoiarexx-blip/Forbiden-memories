/* Forbidden Duel Memories v1.3 — Duel System Overhaul
   Compatibility layer loaded after game.js. Keeps old saves/campaign intact. */

const V13_GUARDIAN_CYCLES=[
 ["Mercúrio","Sol","Lua","Vênus"],
 ["Marte","Júpiter","Saturno","Urano","Plutão","Netuno"]
];
const V13_TERRAIN={
 "Pradaria":{boost:["Terra","Vento","Guerreiro","Besta"],weak:["Trevas"]},
 "Floresta Lunar":{boost:["Trevas","Luz","Besta","Planta"],weak:["Fogo"]},
 "Montanha":{boost:["Vento","Raio","Dragão"],weak:["Aqua"]},
 "Oceano":{boost:["Água","Aqua","Peixe","Serpente Marinha","Raio"],weak:["Fogo","Máquina","Rocha"]},
 "Santuário Sombrio":{boost:["Trevas","Zumbi","Mago"],weak:["Luz","Fada"]},
 "Templo Antigo":{boost:["Luz","Trevas","Mago","Guerreiro"],weak:[]},
 "Desfiladeiro":{boost:["Terra","Trevas","Rocha"],weak:["Água"]}
};
const V13_GENERIC_FUSIONS={
 "dragao|guerreiro":201,"dragao|mago":206,"dragao|passaro":203,"dragao|fogo":207,
 "aquatico|dragao":208,"aquatico|mago":208,"fada|mago":205,"fada|guerreiro":205,
 "fogo|passaro":209,"guerreiro|mago":202,"lua|mago":204,"mago|trevas":204,
 "maquina|guerreiro":210,"pedra|fogo":207,"passaro|vento":203,"sol|guerreiro":201
};
let fusionFieldSel=[];

function v13InitSave(){
 if(save.version13===undefined)save.version13=true;
 if(save.passwordPurchases===undefined)save.passwordPurchases=0;
 persist();
}
v13InitSave();

function guardianOptions(card){
 if(!card)return ["Sol","Lua"];
 let first=card.g||"Sol";
 for(const cycle of V13_GUARDIAN_CYCLES){
  let i=cycle.indexOf(first);if(i>=0)return [first,cycle[(i+1)%cycle.length]];
 }
 return [first,first==="Sol"?"Lua":"Sol"];
}
function guardianRelation(a,b){
 if(!a||!b)return 0;
 for(const cycle of V13_GUARDIAN_CYCLES){
  let i=cycle.indexOf(a),j=cycle.indexOf(b);if(i<0||j<0)continue;
  if((i+1)%cycle.length===j)return 1;
  if((j+1)%cycle.length===i)return -1;
 }
 return 0;
}
function guardianBonus(att,def,attUnit=null,defUnit=null){
 let ag=attUnit?.guardian||att?.g,dg=defUnit?.guardian||def?.g;
 return guardianRelation(ag,dg)*500;
}
function terrainBonus(card){
 if(!S||!card)return 0;
 let profile=V13_TERRAIN[S.terrain]||{boost:S.terrainBonus||[],weak:[]};
 let keys=[card.e,card.t,card.family].filter(Boolean);
 if(keys.some(k=>profile.boost.includes(k)))return 500;
 if(keys.some(k=>profile.weak.includes(k)))return -500;
 return 0;
}
function battleATK(card,unit=null){return Math.max(0,(card?.a||0)+terrainBonus(card)+(unit?.atkBonus||0))}
function battleDEF(card,unit=null){return Math.max(0,(card?.d||0)+terrainBonus(card)+(unit?.defBonus||0))}

function makeDeck(ids,strict=false){
 let clean=(ids||[]).filter(id=>C(id));
 if(strict)return clean.length===40?shuffle(clean.slice()):null;
 if(!clean.length)clean=[1,2,3,4,5];
 let a=[];while(a.length<40)a.push(clean[a.length%clean.length]);return shuffle(a.slice(0,40));
}
function validatePlayerDeck(show=true){
 if(save.deck.length!==40){if(show)msg(`Seu deck precisa ter exatamente 40 cartas (${save.deck.length}/40).`,1800);return false}
 return true;
}
function toggleDeck(id){
 let owned=save.collection[id]||0,count=save.deck.filter(x=>x===id).length,max=Math.min(3,owned);
 if(!owned)return;
 if(count<max&&save.deck.length<40)save.deck.push(id);
 else if(count>0)save.deck.splice(save.deck.lastIndexOf(id),1);
 persist();renderDeck();
}
const _v13RenderDeckBase=renderDeck;
renderDeck=function(){
 _v13RenderDeckBase();
 let count=document.getElementById("deckCount");
 count.classList.toggle("deckInvalid",save.deck.length!==40);
 count.title=save.deck.length===40?"Deck pronto":"O duelo exige exatamente 40 cartas";
};

function startDuel(i){
 if(!validatePlayerDeck())return openDeck();
 freeDuelMode=false;
 let o=OPP[i],regionIdx=Math.floor(i/3),regionKey="region_"+regionIdx,bossKey="boss_"+i;
 let seen=save.storySeen||(save.storySeen={}),launch=()=>beginDuel(i);
 if(i===1&&save.storyFlags.path_secret&&!save.secretWins.canyon){playStory("secret_canyon",()=>startSecretDuel("canyon"),"EVENTO SECRETO");return}
 if(i===9&&!save.storyFlags.ocean_destroy&&!save.storyFlags.ocean_preserve){playStory("choice_3",()=>{if(save.storyFlags.ocean_preserve&&!save.secretWins.ocean)playStory("secret_ocean",()=>grantOceanSecret(),"PASSAGEM SUBMERSA");else launch()},"DECISÃO NO OCEANO");return}
 if(o.boss&&STORY[bossKey]&&!seen[bossKey]){playStory(bossKey,()=>{seen[bossKey]=true;persist();launch()},o.region);return}
 if(i%3===0&&STORY[regionKey]&&!seen[regionKey]){playStory(regionKey,()=>{seen[regionKey]=true;persist();launch()},o.region);return}
 launch();
}
function startFreeDuel(i){if(!validatePlayerDeck())return openDeck();freeDuelMode=true;beginDuel(i)}

function v13DuelState(pdeck,edeck,o,extra={}){
 return {pLP:8000,eLP:8000,pDeck:pdeck,eDeck:edeck,pHand:[],eHand:[],pField:Array(5).fill(null),eField:Array(5).fill(null),
  pSupport:Array(5).fill(null),eSupport:Array(5).fill(null),turn:1,side:"p",selectedHand:null,selectedField:null,target:null,
  attacked:new Set(),summoned:false,cardPlayed:false,over:false,terrain:o.terrain||"Pradaria",terrainBonus:o.bonus||[],enemyProfile:o,
  deckOut:null,...extra,stats:{dealt:0,taken:0,fusions:0,destroyed:0,direct:0,spells:0,equips:0,traps:0,rituals:0,cardsUsed:0,turnsDefensive:0}}
}
function beginDuel(i){
 currentOpponent=i;let o=OPP[i];if(o.boss)playSfx("boss");
 let pdeck=makeDeck(save.deck,true);if(!pdeck){openDeck();return}
 let edeck=makeDeck(o.deck);
 S=v13DuelState(pdeck,edeck,o);
 drawUntilFive("p",false);drawUntilFive("e",false);
 document.getElementById("enemyName").textContent=o.name;document.getElementById("enemyPortrait").textContent=o.icon;
 fusionMode=false;fusionSel=[];fusionFieldSel=[];attackMode=false;shownPLP=8000;shownELP=8000;showScreen("duel");renderAll();msg("DUEL START!",900)
}
function startSecretDuel(type){
 let secret={canyon:{name:"Duelista Errante",icon:"🦂",rank:8,stars:5,ai:.72,terrain:"Desfiladeiro",bonus:["Trevas","Terra"],deck:[45,51,60,61,62,33,34,37,302,311,312,324]}}[type];
 if(!secret||!validatePlayerDeck())return;
 freeDuelMode=false;currentOpponent=-1;S=v13DuelState(makeDeck(save.deck,true),makeDeck(secret.deck),secret,{secretType:type});
 drawUntilFive("p",false);drawUntilFive("e",false);document.getElementById("enemyName").textContent=secret.name;document.getElementById("enemyPortrait").textContent=secret.icon;
 fusionMode=false;fusionSel=[];fusionFieldSel=[];attackMode=false;shownPLP=8000;shownELP=8000;showScreen("duel");renderAll();msg("DUELO SECRETO!",900)
}
function draw(side){
 let d=side==="p"?S.pDeck:S.eDeck,h=side==="p"?S.pHand:S.eHand;
 if(h.length>=5)return true;
 if(!d.length){S.deckOut=side;return false}
 h.push(d.pop());return true;
}
function drawUntilFive(side,check=true){
 let h=side==="p"?S.pHand:S.eHand;
 while(h.length<5){if(!draw(side)){if(check)checkOver();return false}}
 return true;
}

function renderSupport(side){
 let zone=document.getElementById(side==="p"?"playerSupport":"enemySupport");if(!zone)return;
 let arr=side==="p"?S.pSupport:S.eSupport;zone.innerHTML="";
 arr.forEach((x,i)=>{let slot=document.createElement("div");slot.className="slot";if(x){let c=C(x.id),card=document.createElement("div");card.className="boardCard supportCard "+(x.faceDown?"facedown":"");card.dataset.kind=c.kind;card.innerHTML=x.faceDown?"<div class='cname'>SET</div><div class='cart'><span>❓</span></div>":`<div class="rarity">${c.rarity||"N"}</div><div class="cname">${c.n}</div><div class="cart"><span>${c.art}</span></div>`;slot.appendChild(card)}zone.appendChild(slot)})
}
const _v13RenderAllBase=renderAll;
renderAll=function(){_v13RenderAllBase();renderSupport("p");renderSupport("e")};

function unitGuardian(u,c){return u?.guardian||c?.g||"Sol"}
function renderZone(side){
 let zone=document.getElementById(side==="p"?"playerZone":"enemyZone"),field=side==="p"?S.pField:S.eField;zone.innerHTML="";
 field.forEach((x,i)=>{let slot=document.createElement("div");slot.className="slot";if(x){let c=C(x.id),card=document.createElement("div");card.className="boardCard "+(x.pos==="def"?"defense ":"")+(x.faceDown?"facedown ":"");card.dataset.kind="monster";card.dataset.family=c.family||"";card.dataset.guardian=unitGuardian(x,c);card.dataset.rarity=c.rarity||"N";if(side==="p"&&S.selectedField===i)card.classList.add("selected");if(side==="e"&&attackMode&&S.selectedField!==null)card.classList.add("targetable");let atk=battleATK(c,x),def=battleDEF(c,x),eq=(x.equipNames||[]).join(" + ");card.innerHTML=`<div class="rarity">${c.rarity||"N"}</div><div class="cname">${x.faceDown&&side==="e"?"???":c.n}</div><div class="cart"><span>${x.faceDown&&side==="e"?"❓":c.art}</span><i>${x.faceDown&&side==="e"?"":(c.family||c.t)}</i></div><div class="cmeta"><span>${x.faceDown&&side==="e"?"":c.t}</span><span>${x.faceDown&&side==="e"?"":c.e}</span></div><div class="guardian">★ ${unitGuardian(x,c)}</div>${eq?`<div class="equipTag">⚙ ${eq}</div>`:""}<div class="cnums">A ${x.faceDown&&side==="e"?"?":atk} / D ${x.faceDown&&side==="e"?"?":def}</div>`;card.onclick=()=>fieldTap(side,i);slot.appendChild(card)}zone.appendChild(slot)})
}
function renderHand(){
 let h=document.getElementById("hand");h.innerHTML="";S.pHand.forEach((id,i)=>{let c=C(id),el=document.createElement("div");el.className="boardCard handCard";el.dataset.kind=c.kind||"monster";el.dataset.family=c.family||"";el.dataset.guardian=c.g||"";el.dataset.rarity=c.rarity||"N";if(S.selectedHand===i||fusionSel.includes(i))el.classList.add("selected");if(isMonster(c)){let gs=guardianOptions(c);el.innerHTML=`<div class="rarity">${c.rarity||"N"}</div><div class="cname">${c.n}</div><div class="cart"><span>${c.art}</span><i>${c.family||c.t}</i></div><div class="cmeta"><span>${c.t}</span><span>${c.e}</span></div><div class="guardian">★ ${gs.join(" / ")}</div><div class="cnums">A ${c.a} / D ${c.d}</div>`}else el.innerHTML=`<div class="rarity">${c.rarity||"N"}</div><div class="cname">${c.n}</div><div class="cart"><span>${c.art}</span><i>${c.family||c.t}</i></div><div class="cmeta"><span>${c.t}</span><span>${c.e||""}</span></div><div class="effectDesc">${c.desc||""}</div>`;el.onclick=()=>handTap(i);h.appendChild(el)})
}
function renderButtons(){
 let mine=S.side==="p"&&!S.over,c=S.selectedHand!==null?C(S.pHand[S.selectedHand]):null,needsSlot=!c||isMonster(c)||c.kind==="ritual";
 document.getElementById("btnPlay").disabled=!mine||(!fusionMode&&S.selectedHand===null)||S.cardPlayed||(needsSlot&&freeSlot(S.pField)<0);
 document.getElementById("btnFusion").disabled=!mine||S.cardPlayed;
 document.getElementById("btnAttack").disabled=!mine||S.selectedField===null;
 document.getElementById("btnFlip").disabled=!mine||S.selectedField===null;
 document.getElementById("btnEnd").disabled=!mine;
 let tray=document.getElementById("fusionTray");tray.classList.toggle("hidden",!fusionMode);let parts=fusionSel.map(i=>C(S.pHand[i])?.n).filter(Boolean).concat(fusionFieldSel.map(i=>C(S.pField[i]?.id)?.n).filter(Boolean));tray.innerHTML=parts.map(n=>`<span class="fusionChip">${n}</span>`).join("<span>＋</span>")
}
function handTap(i){
 if(S.side!=="p"||S.over)return;if(fusionMode){if(!isMonster(C(S.pHand[i])))return msg("Fusões usam monstros da mão ou do campo.");let p=fusionSel.indexOf(i);if(p>=0)fusionSel.splice(p,1);else if(fusionSel.length+fusionFieldSel.length<5)fusionSel.push(i)}else{S.selectedHand=S.selectedHand===i?null:i;S.selectedField=null;attackMode=false}renderAll()
}
function fieldTap(side,i){
 if(S.side!=="p"||S.over)return;if(side==="p"){if(fusionMode&&S.pField[i]){let p=fusionFieldSel.indexOf(i);if(p>=0)fusionFieldSel.splice(p,1);else if(fusionSel.length+fusionFieldSel.length<5)fusionFieldSel.push(i);renderAll();return}if(S.pField[i]){S.selectedField=S.selectedField===i?null:i;S.selectedHand=null;attackMode=false;renderAll()}}else if(attackMode&&S.selectedField!==null&&S.eField[i])resolveAttack(S.selectedField,i)
}
function toggleFusionMode(){fusionMode=!fusionMode;fusionSel=[];fusionFieldSel=[];S.selectedHand=null;renderAll();if(fusionMode)msg("FUSÃO: selecione de 2 a 5 monstros da mão/campo.",1100)}

function findFusion(a,b){
 let f=FUS.find(x=>(x[0][0]===a&&x[0][1]===b)||(x[0][0]===b&&x[0][1]===a));if(f)return f[1];
 let A=C(a),B=C(b);if(!isMonster(A)||!isMonster(B))return null;
 let key=[A.family,B.family].sort().join("|");let generic=V13_GENERIC_FUSIONS[key];if(generic)return generic;
 // broad Forbidden-Memories-style category resolver: only upgrades when result is stronger than both materials
 let candidates=DB.filter(c=>c.fusion&&isMonster(c));let target=Math.max(A.a||0,B.a||0)+300;
 let typeMatch=candidates.filter(c=>[A.t,B.t,A.e,B.e].includes(c.t)||[A.e,B.e].includes(c.e));
 let pick=(typeMatch.length?typeMatch:candidates).filter(c=>(c.a||0)>=target).sort((x,y)=>(x.a||0)-(y.a||0))[0];
 return pick?.id||null;
}
function chainFusion(ids){let r=chainFusionDetailed(ids);return r.made?r.id:null}
function chainFusionDetailed(ids){
 if(ids.length<2)return {id:ids[0]||null,made:false};let cur=ids[0],made=false;
 for(let i=1;i<ids.length;i++){let next=ids[i],r=findFusion(cur,next);if(r){cur=r;made=true}else cur=next}
 return {id:cur,made};
}
function playSelection(){
 if(S.cardPlayed)return msg("Você já realizou sua jogada de mão neste turno.");
 if(fusionMode){let sources=[...fusionSel.map(i=>({where:"hand",i,id:S.pHand[i]})),...fusionFieldSel.map(i=>({where:"field",i,id:S.pField[i]?.id}))].filter(x=>x.id);if(sources.length<2)return msg("Selecione pelo menos 2 monstros.");let ids=sources.map(x=>x.id),r=chainFusionDetailed(ids);[...fusionSel].sort((a,b)=>b-a).forEach(i=>S.pHand.splice(i,1));let fieldSlots=[...fusionFieldSel].sort((a,b)=>b-a);fieldSlots.forEach(i=>S.pField[i]=null);fusionSel=[];fusionFieldSel=[];fusionMode=false;if(sources.some(x=>x.where==="field")){let slot=fieldSlots.length?fieldSlots[fieldSlots.length-1]:freeSlot(S.pField);if(slot<0)slot=freeSlot(S.pField);if(slot<0){S.pHand.push(r.id)}else{let c=C(r.id);S.pField[slot]={id:r.id,pos:"atk",faceDown:false,guardian:guardianOptions(c)[0],atkBonus:0,defBonus:0,equipNames:[]};S.cardPlayed=true;S.summoned=true;S.selectedField=slot}}else{S.pHand.push(r.id);S.selectedHand=S.pHand.length-1}if(r.made){S.stats.fusions++;playSfx("fusion");playFusionCinematic(ids,r.id);msg("FUSÃO: "+C(r.id).n,1300)}else msg("Fusão incompatível: a última carta permaneceu.",1300);renderAll();return}
 if(S.selectedHand===null)return;let idx=S.selectedHand,card=C(S.pHand[idx]);if(!isMonster(card)){playMagicCard(idx);return}openPositionChoice(S.pHand[idx],idx)
}
function openPositionChoice(id,idx){
 let c=C(id),box=document.getElementById("choice"),buttons=document.getElementById("choiceButtons"),stars=guardianOptions(c);document.getElementById("choiceTitle").textContent=c.n;document.getElementById("choiceText").textContent="Escolha posição e Guardian Star.";buttons.innerHTML="";
 for(const star of stars)for(const [txt,pos,fd] of [["ATK ABERTO","atk",false],["DEF ABERTO","def",false],["DEF VIRADO","def",true]]){let b=document.createElement("button");b.className="bigChoice";b.innerHTML=`<b>${txt}</b><span class="guardianChoice">★ ${star}</span>`;b.onclick=()=>{box.classList.add("hidden");summonFromHand(idx,pos,fd,star)};buttons.appendChild(b)}let cancel=document.createElement("button");cancel.className="bigChoice";cancel.innerHTML="<b>CANCELAR</b>Voltar ao campo";cancel.onclick=()=>box.classList.add("hidden");buttons.appendChild(cancel);box.classList.remove("hidden")
}
function summonFromHand(idx,pos,faceDown,guardian=null){let s=freeSlot(S.pField);if(s<0)return;let id=S.pHand.splice(idx,1)[0],c=C(id);S.pField[s]={id,pos,faceDown,guardian:guardian||guardianOptions(c)[0],atkBonus:0,defBonus:0,equipNames:[]};S.cardPlayed=true;S.summoned=true;S.stats.cardsUsed++;S.selectedHand=null;S.selectedField=s;playSfx("summon");playSummonCinematic(c,S.pField[s]);msg(c.n+" entrou no campo.",1000);renderAll()}

function supportSlot(side){return freeSlot(side==="p"?S.pSupport:S.eSupport)}
function setSupport(side,id,faceDown=true){let arr=side==="p"?S.pSupport:S.eSupport,s=freeSlot(arr);if(s<0)return -1;arr[s]={id,faceDown};return s}
function consumeSupport(side,index){let arr=side==="p"?S.pSupport:S.eSupport,c=arr[index]?C(arr[index].id):null;arr[index]=null;return c}
function triggerTrap(side,ctx){
 let arr=side==="p"?S.pSupport:S.eSupport;for(let i=0;i<arr.length;i++){let u=arr[i],c=u&&C(u.id);if(!c||c.kind!=="trap")continue;let atk=ctx.attackerCard?battleATK(ctx.attackerCard,ctx.attackerUnit):0,trigger=false;if(c.effect==="negateDirect"&&ctx.direct)trigger=true;else if(c.effect==="destroyStrongest"&&!ctx.direct&&atk>=2000)trigger=true;else if(["halveAttack","destroyAttacker","weaken800","switchDefense"].includes(c.effect)&&!ctx.direct)trigger=true;if(!trigger)continue;u.faceDown=false;S.stats.traps++;playSfx("magic");msg("ARMADILHA: "+c.n+"!",900);consumeSupport(side,i);return c.effect}return null
}
function playMagicCard(idx){
 if(S.cardPlayed)return msg("Você já jogou uma carta neste turno.");let card=C(S.pHand[idx]);
 if(card.kind==="trap"){if(supportSlot("p")<0)return msg("Sua zona de suporte está cheia.");removeHandCard(idx);setSupport("p",card.id,true);S.cardPlayed=true;S.stats.cardsUsed++;msg(card.n+" foi colocada virada para baixo.",1000);renderAll();return}
 if(card.kind==="ritual"){playRitual(idx,card);return}
 if(card.kind==="terrain"){playSfx("magic");removeHandCard(idx);S.terrain=card.terrain;S.terrainBonus=[...card.bonus];S.stats.spells++;S.stats.cardsUsed++;S.cardPlayed=true;msg("CAMPO ALTERADO: "+card.terrain.toUpperCase(),1200);renderAll();return}
 if(card.kind==="spell"){playSfx("magic");removeHandCard(idx);S.stats.spells++;S.stats.cardsUsed++;S.cardPlayed=true;if(card.effect==="draw2"){drawUntilFive("p");msg("VISÃO ANCESTRAL: mão restaurada.",1000)}if(card.effect==="burn500"){S.eLP=Math.max(0,S.eLP-500);S.stats.dealt+=500;msg("RUPTURA ESPIRITUAL: -500 LP",1000)}if(card.effect==="burn800"){S.eLP=Math.max(0,S.eLP-800);S.stats.dealt+=800;msg("CHAMA DO DESTINO: -800 LP",1000)}renderAll();checkOver();return}
 if(card.kind==="equip"){playSfx("magic");openEquipChoice(idx,card);return}
}
function equipCard(handIdx,fieldIdx,card){let u=S.pField[fieldIdx];if(!u||S.cardPlayed)return;S.pHand.splice(handIdx,1);S.selectedHand=null;u.atkBonus=(u.atkBonus||0)+(card.atkBonus||0);u.defBonus=(u.defBonus||0)+(card.defBonus||0);(u.equipNames||(u.equipNames=[])).push(card.n);S.stats.equips++;S.stats.cardsUsed++;S.cardPlayed=true;if(supportSlot("p")>=0)setSupport("p",card.id,false);msg(card.n+" equipado em "+C(u.id).n+".",1000);renderAll()}
function playRitual(idx,card){
 let handMons=S.pHand.map((id,i)=>isMonster(C(id))?i:null).filter(i=>i!==null),fieldMons=S.pField.map((u,i)=>u?i:null).filter(i=>i!==null),need=card.materials||3;if(handMons.length+fieldMons.length<need)return msg(`Ritual exige ${need} monstros como tributo.`);let slot=freeSlot(S.pField);let tributeField=fieldMons.slice(0,Math.min(need,fieldMons.length)),remaining=need-tributeField.length,tributeHand=handMons.filter(i=>i!==idx).slice(0,remaining);if(slot<0&&tributeField.length===0)return msg("Sem espaço para o ritual.");S.pHand.splice(idx,1);tributeHand.sort((a,b)=>b-a).forEach(i=>{let adj=i>idx?i-1:i;S.pHand.splice(adj,1)});tributeField.forEach(i=>S.pField[i]=null);slot=tributeField[0]??freeSlot(S.pField);let result=C(card.result);S.pField[slot]={id:card.result,pos:"atk",faceDown:false,guardian:guardianOptions(result)[0],atkBonus:0,defBonus:0,equipNames:[]};S.cardPlayed=true;S.summoned=true;S.stats.rituals++;S.stats.cardsUsed+=need+1;S.selectedHand=null;playSfx("fusion");playSummonCinematic(result,S.pField[slot]);msg("RITUAL: "+result.n+" foi invocado!",1400);renderAll()
}

function resolveAttack(ai,di){
 let A=S.pField[ai],D=S.eField[di];if(!A||!D)return;let ac=C(A.id),dc=C(D.id);attackMode=false;S.attacked.add(ai);let trap=triggerTrap("e",{direct:false,attackerUnit:A,attackerCard:ac});if(trap==="destroyAttacker"||(trap==="destroyStrongest"&&battleATK(ac,A)>=2000)){S.pField[ai]=null;renderAll();return}if(trap==="switchDefense"){A.pos="def";renderAll();return}let penalty=trap==="halveAttack"?-Math.floor(battleATK(ac,A)/2):trap==="weaken800"?-800:0;playSfx("attack");playBattleCinematic(ac,dc,A,D);let atk=Math.max(0,battleATK(ac,A)+guardianBonus(ac,dc,A,D)+penalty),defPower=D.pos==="atk"?battleATK(dc,D):battleDEF(dc,D);setTimeout(()=>{if(D.faceDown){D.faceDown=false}let diff=atk-defPower;if(D.pos==="atk"){if(diff>0){S.eLP-=diff;S.stats.dealt+=diff;S.stats.destroyed++;S.eField[di]=null;msg(`${ac.n} destruiu ${dc.n}! -${diff} LP`,1200)}else if(diff<0){S.pLP-=Math.abs(diff);S.stats.taken+=Math.abs(diff);S.pField[ai]=null;msg(`${ac.n} foi destruído! -${Math.abs(diff)} LP`,1200)}else{S.eField[di]=null;S.pField[ai]=null;msg("Empate! As duas cartas foram destruídas.",1100)}}else{if(diff>0){S.eField[di]=null;S.stats.destroyed++;msg(`${dc.n} foi destruído em defesa.`,1000)}else if(diff<0){S.pLP-=Math.abs(diff);S.stats.taken+=Math.abs(diff);msg(`Defesa resistiu! -${Math.abs(diff)} LP`,1000)}else msg("Ataque bloqueado.",800)}S.selectedField=null;renderAll();checkOver()},280)
}
function directAttack(side,idx){
 if(side==="p"){let u=S.pField[idx],c=C(u.id),trap=triggerTrap("e",{direct:true,attackerUnit:u,attackerCard:c});S.attacked.add(idx);if(trap==="negateDirect"){S.pLP=Math.max(0,S.pLP-500);S.stats.taken+=500;renderAll();checkOver();return}let dmg=battleATK(c,u);S.eLP-=dmg;S.stats.dealt+=dmg;S.stats.direct++;msg(`ATAQUE DIRETO! -${dmg} LP`,1000)}else{let u=S.eField[idx],c=C(u.id),trap=triggerTrap("p",{direct:true,attackerUnit:u,attackerCard:c});if(trap==="negateDirect"){S.eLP=Math.max(0,S.eLP-500);S.stats.dealt+=500;renderAll();checkOver();return}let dmg=battleATK(c,u);S.pLP-=dmg;S.stats.taken+=dmg;msg(`ATAQUE DIRETO INIMIGO! -${dmg} LP`,1000)}attackMode=false;renderAll();checkOver()
}
function aiResolveAttack(ai,di){
 let A=S.eField[ai],D=S.pField[di];if(!A||!D)return;let ac=C(A.id),dc=C(D.id),trap=triggerTrap("p",{direct:false,attackerUnit:A,attackerCard:ac});if(trap==="destroyAttacker"||(trap==="destroyStrongest"&&battleATK(ac,A)>=2000)){S.eField[ai]=null;renderAll();return}if(trap==="switchDefense"){A.pos="def";renderAll();return}let penalty=trap==="halveAttack"?-Math.floor(battleATK(ac,A)/2):trap==="weaken800"?-800:0,atk=Math.max(0,battleATK(ac,A)+guardianBonus(ac,dc,A,D)+penalty),dp=D.pos==="atk"?battleATK(dc,D):battleDEF(dc,D),diff=atk-dp;if(D.faceDown)D.faceDown=false;if(D.pos==="atk"){if(diff>0){S.pLP-=diff;S.stats.taken+=diff;S.pField[di]=null;msg("Seu monstro foi destruído! -"+diff+" LP",800)}else if(diff<0){S.eLP-=Math.abs(diff);S.stats.dealt+=Math.abs(diff);S.eField[ai]=null;msg("Oponente perdeu o combate!",800)}else{S.eField[ai]=null;S.pField[di]=null;msg("As cartas se destruíram!",800)}}else{if(diff>0){S.pField[di]=null;msg("Sua defesa foi destruída.",800)}else if(diff<0){S.eLP-=Math.abs(diff);S.stats.dealt+=Math.abs(diff);msg("Sua defesa causou dano!",800)}}renderAll();checkOver()
}

function bestAIFusion(){
 let best=null;for(let i=0;i<S.eHand.length;i++)for(let j=i+1;j<S.eHand.length;j++){let a=S.eHand[i],b=S.eHand[j],r=findFusion(a,b);if(r){let gain=(C(r)?.a||0)-Math.max(C(a)?.a||0,C(b)?.a||0);if(!best||gain>best.gain)best={i,j,r,gain}}}if(!best)return false;S.eHand.splice(best.j,1);S.eHand.splice(best.i,1);S.eHand.push(best.r);return true
}
async function aiPlayOneCard(o){
 let ng=save.ngPlus||0;
 // High AI prioritizes a useful fusion before deciding its single play.
 if(Math.random()<o.ai)bestAIFusion();
 let trapIdx=S.eHand.findIndex(id=>C(id)?.kind==="trap");if(trapIdx>=0&&supportSlot("e")>=0&&Math.random()<o.ai*.35){let id=S.eHand.splice(trapIdx,1)[0];setSupport("e",id,true);S.cardPlayed=true;msg("Oponente colocou uma carta virada para baixo.",700);return}
 let terrainIdx=S.eHand.findIndex(id=>C(id)?.kind==="terrain");if(terrainIdx>=0&&Math.random()<o.ai*.22){let c=C(S.eHand.splice(terrainIdx,1)[0]);S.terrain=c.terrain;S.terrainBonus=[...c.bonus];S.cardPlayed=true;msg("Oponente alterou o terreno.",700);return}
 let spellIdx=S.eHand.findIndex(id=>C(id)?.kind==="spell");if(spellIdx>=0&&Math.random()<o.ai*.28){let c=C(S.eHand.splice(spellIdx,1)[0]);if(c.effect==="draw2")drawUntilFive("e");if(c.effect==="burn500"){S.pLP-=500;S.stats.taken+=500}if(c.effect==="burn800"){S.pLP-=800;S.stats.taken+=800}S.cardPlayed=true;msg("Oponente ativou "+c.n+".",700);return}
 if(freeSlot(S.eField)>=0){let opts=S.eHand.map((id,i)=>({id,i,c:C(id)})).filter(x=>isMonster(x.c)).map(x=>({...x,score:battleATK(x.c)+battleDEF(x.c)})).sort((a,b)=>b.score-a.score);let best=opts[0];if(best){let id=S.eHand.splice(best.i,1)[0],slot=freeSlot(S.eField),c=C(id),defensive=battleDEF(c)>battleATK(c)&&Math.random()>o.ai;let gs=guardianOptions(c);S.eField[slot]={id,pos:defensive?"def":"atk",faceDown:defensive&&Math.random()<.55,guardian:gs[Math.random()<.5?0:1],atkBonus:ng*180,defBonus:ng*180,equipNames:[]};S.cardPlayed=true;playSfx("summon");playSummonCinematic(c,S.eField[slot],true);msg(o.name+" jogou uma carta.",700);return}}
 let equipIdx=S.eHand.findIndex(id=>C(id)?.kind==="equip");if(equipIdx>=0){let ec=C(S.eHand[equipIdx]),targets=S.eField.map((u,i)=>u?{u,i,c:C(u.id)}:null).filter(Boolean).filter(x=>ec.target==="monster"||x.c.t===ec.target);if(targets.length){let t=targets.sort((a,b)=>battleATK(b.c,b.u)-battleATK(a.c,a.u))[0];S.eHand.splice(equipIdx,1);t.u.atkBonus=(t.u.atkBonus||0)+(ec.atkBonus||0);t.u.defBonus=(t.u.defBonus||0)+(ec.defBonus||0);S.cardPlayed=true;msg("Oponente equipou "+ec.n+".",700)}}
}
async function aiTurn(){
 if(S.over)return;S.cardPlayed=false;drawUntilFive("e");if(S.over)return;let o=S.enemyProfile||OPP[currentOpponent];bossBehavior();renderAll();checkOver();if(S.over)return;await aiPlayOneCard(o);renderAll();checkOver();if(S.over)return;await wait(450);
 for(let i=0;i<5&&!S.over;i++){let u=S.eField[i];if(!u||u.pos!=="atk")continue;let targets=S.pField.map((x,k)=>x?{x,k}:null).filter(Boolean);if(!targets.length){directAttack("e",i);await wait(450);continue}let candidates=targets.map(t=>{let dc=C(t.x.id),ac=C(u.id),atk=battleATK(ac,u)+guardianBonus(ac,dc,u,t.x),def=t.x.pos==="atk"?battleATK(dc,t.x):battleDEF(dc,t.x);return {...t,diff:atk-def}}).sort((a,b)=>b.diff-a.diff);let target=Math.random()<o.ai?candidates[0]:candidates[Math.floor(Math.random()*candidates.length)];aiResolveAttack(i,target.k);await wait(520)}
 if(S.over)return;S.turn++;S.side="p";S.summoned=false;S.cardPlayed=false;S.attacked=new Set();drawUntilFive("p");renderAll();if(!S.over)msg("SEU TURNO",700)
}
function endTurn(){if(S.side!=="p")return;fusionMode=false;fusionSel=[];fusionFieldSel=[];attackMode=false;S.selectedField=null;S.selectedHand=null;S.side="e";if(S.pField.filter(Boolean).every(u=>u.pos==="def"))S.stats.turnsDefensive++;renderAll();setTimeout(aiTurn,450)}

function checkOver(){
 if(S.over)return;if(S.pLP<=0){S.pLP=0;finish(false)}else if(S.eLP<=0){S.eLP=0;finish(true)}else if(S.deckOut==="p"){finish(false,"DECK-OUT")}else if(S.deckOut==="e"){finish(true,"DECK-OUT")}
}
function duelRank(win){
 if(!win)return "D-POW";let pow=0,tec=0;pow+=Math.max(0,12-S.turn)*2+S.stats.destroyed*3+S.stats.direct*2+Math.floor(S.stats.dealt/2000);tec+=S.stats.spells*3+S.stats.traps*4+S.stats.rituals*3+S.stats.equips*2+S.stats.turnsDefensive*2+Math.max(0,S.turn-8);tec+=S.stats.fusions>2?S.stats.fusions:0;let mode=tec>pow?"TEC":"POW",score=mode==="TEC"?tec:pow,grade=score>=24?"S":score>=18?"A":score>=12?"B":score>=7?"C":"D";return `${grade}-${mode}`
}
function rankValue(r){let g=String(r||"").split("-")[0];return {S:5,A:4,B:3,C:2,D:1}[g]||0}
function rewardCard(rank){
 let o=S?.enemyProfile||OPP[currentOpponent],mode=String(rank).includes("TEC")?"TEC":"POW",baseIds=(o?.deck||[]).filter(id=>C(id)&&!C(id).fusion),pool=[...new Set(baseIds.map(C).filter(Boolean))];if(!pool.length)pool=DB.filter(c=>!c.fusion&&c.bossExclusive===undefined);let rv=rankValue(rank);pool=pool.filter(c=>{let rarity=c.rarity||"N";if(mode==="POW")return rv>=5?true:rv>=4?rarity!=="UR":["N","R"].includes(rarity);return rv>=5?true:rv>=4?rarity!=="UR":rarity!=="UR"});if(mode==="TEC"){let tech=pool.filter(c=>["spell","trap","equip","terrain","ritual"].includes(c.kind));if(tech.length&&Math.random()<.65)pool=tech}return pool[Math.floor(Math.random()*pool.length)]||DB.find(c=>!c.fusion)
}
const _v13Finish=finish;
finish=function(win,reason=""){
 if(S.over)return;let old=S.deckOut;S.deckOut=null;_v13Finish(win);if(reason&&document.getElementById("resultText"))document.getElementById("resultText").innerHTML+=`<br><b>${reason}</b>`;S.deckOut=old
};

function openPasswordShop(){document.getElementById("passwordResult").innerHTML=`Estrelas disponíveis: <b>★ ${save.stars}</b><br>Use o ID numérico mostrado no registro interno da carta.`;document.getElementById("passwordInput").value="";showScreen("passwordScreen")}
function redeemPassword(){let id=Number(document.getElementById("passwordInput").value),c=C(id),out=document.getElementById("passwordResult");if(!c||c.fusion||c.bossExclusive!==undefined){out.textContent="Código inválido ou carta não disponível no terminal.";return}let cost={N:5,R:20,SR:80,UR:250}[c.rarity||"N"]||10;if(save.stars<cost){out.innerHTML=`${c.n} custa ★ ${cost}. Você possui ★ ${save.stars}.`;return}save.stars-=cost;save.collection[id]=(save.collection[id]||0)+1;save.passwordPurchases++;persist();out.innerHTML=`Carta obtida: <b>${c.n}</b> por ★ ${cost}.<br>Saldo: ★ ${save.stars}.`}

// Update old terrain descriptions in memory is impossible because cards are frozen; UI uses the new ±500 resolver.
console.info("Forbidden Duel Memories v1.3 duel overhaul loaded", {cards:DB.length, fusions:FUS.length});

/* v1.3.1 completion patch: five-seal victory, richer enemy tech decks and password IDs. */
function hasForbiddenFive(side){
 let h=side==="p"?S.pHand:S.eHand,parts=new Set(h.map(id=>C(id)?.exodiaPart).filter(Boolean));return parts.size===5
}
const _v13DrawUntilFiveCore=drawUntilFive;
drawUntilFive=function(side,check=true){
 let ok=_v13DrawUntilFiveCore(side,check);if(S&&!S.over&&hasForbiddenFive(side)){S.forbiddenFive=side;if(check)checkOver()}return ok
};
const _v13CheckOverCore=checkOver;
checkOver=function(){
 if(S&&!S.over&&S.forbiddenFive){let side=S.forbiddenFive;S.forbiddenFive=null;finish(side==="p","CINCO SELOS PROIBIDOS");return}_v13CheckOverCore()
};
function enhanceEnemyDeck(deck,rank){ return shuffle(deck.slice()); }
const _v13BeginDuelCore=beginDuel;
beginDuel=function(i){
 _v13BeginDuelCore(i)
};
const _v13RewardCardCore=rewardCard;
rewardCard=function(rank){
 let mode=String(rank).includes("TEC")?"TEC":"POW";
 if(mode==="TEC"&&rankValue(rank)>=4&&Math.random()<.40){let tech=DB.filter(c=>!c.fusion&&c.bossExclusive===undefined&&["spell","trap","equip","terrain","ritual"].includes(c.kind));if(tech.length)return tech[Math.floor(Math.random()*tech.length)]}
 return _v13RewardCardCore(rank)
};
const _v13OpenCardViewerCore=openCardViewer;
openCardViewer=function(id){_v13OpenCardViewerCore(id);let c=C(id),info=document.getElementById("viewerInfo");if(c&&info)info.innerHTML+=`<br>Password ID: <b>${String(c.id).padStart(3,"0")}</b>${c.exodiaPart?`<br><span class="exclusiveText">Selo Proibido ${c.exodiaPart}/5</span>`:""}`};
