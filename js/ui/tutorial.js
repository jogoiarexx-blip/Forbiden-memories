/* Forbidden Duel Memories v2.2 — interactive tutorial + contextual help */
(function(){
const TUTORIAL_KEY='fdm_tutorial_v22';
const GUIDE=[
 {icon:'🃏',title:'Mão e jogada do turno',text:'Você começa com até 5 cartas. Em cada turno faça uma jogada principal: invoque um monstro, use uma magia/trap/equipamento/ritual ou monte uma fusão.'},
 {icon:'✦',title:'Fusões',text:'Ative FUSÃO e selecione de 2 a 5 monstros da mão ou do campo. A ordem importa quando uma combinação falha: a última carta válida continua a sequência.'},
 {icon:'★',title:'Guardian Stars',text:'Cada monstro oferece duas Guardian Stars. A vantagem correta concede +500 no combate. Escolha a estrela ao colocar o monstro no campo.'},
 {icon:'🌍',title:'Terrenos',text:'Cada terreno favorece e enfraquece famílias/elementos. Bônus e penalidades podem alterar ATK e DEF em 500 pontos.'},
 {icon:'🪤',title:'Traps e suporte',text:'Armadilhas ficam viradas na zona de suporte e ativam quando a condição acontece. Equipamentos e terrenos também ocupam o sistema de suporte/efeitos.'},
 {icon:'🔯',title:'Rituais',text:'Cartas de Ritual sacrificam monstros para invocar uma criatura especial. Verifique os materiais necessários antes de usar.'},
 {icon:'⚔',title:'Batalha',text:'Monstros em ataque podem atacar uma vez por turno. Contra defesa, compare seu ATK com a DEF do alvo. Sem monstros adversários, o ataque pode ser direto.'},
 {icon:'🏆',title:'Ranking POW / TEC',text:'POW recompensa partidas agressivas e rápidas. TEC valoriza traps, magias, rituais e jogo técnico. O ranking influencia as cartas recebidas após a vitória.'}
];
const DUEL_STEPS=[
 {title:'BEM-VINDO AO DUELO',text:'Esta é sua arena. O objetivo é reduzir os LP do adversário a zero, fazê-lo ficar sem cartas para comprar ou completar uma condição especial.',selector:'.ps1Board'},
 {title:'LP E DECKS',text:'No topo ficam os LP e a quantidade de cartas restantes nos dois decks. Planeje o duelo antes que seu baralho acabe.',selector:'.ps1StatusPanel'},
 {title:'SUA MÃO',text:'Você mantém até 5 cartas na mão. Selecione uma carta para ver ATK, DEF, tipo, elemento e Guardian Star na barra inferior.',selector:'.ps1HandDock'},
 {title:'INFORMAÇÕES DA CARTA',text:'Esta barra mostra os dados da carta selecionada. Terreno, equipamentos e outros bônus podem alterar os valores usados no combate.',selector:'.ps1CardInfo'},
 {title:'COMANDOS',text:'JOGAR coloca/ativa a carta. FUSÃO combina materiais. ATACAR inicia a batalha. POSIÇÃO alterna ataque/defesa e FIM encerra seu turno.',selector:'.ps1CommandPanel'},
 {title:'FUSÕES',text:'Para fundir, pressione FUSÃO e selecione de 2 a 5 monstros. Você também pode incluir monstros que já estejam no seu campo.',selector:'#btnFusion'},
 {title:'CAMPO E SUPORTE',text:'As linhas maiores recebem monstros. As linhas menores recebem traps e cartas de suporte. Cartas em defesa ficam visualmente rotacionadas.',selector:'#playerZone'},
 {title:'PRONTO PARA DUELAR',text:'Use o botão ? no canto do FIELD sempre que quiser rever as regras. As dicas contextuais aparecem apenas na primeira vez que cada sistema é usado.',selector:'#duelHelpBtn'}
];
let state=loadTutorialState(),stepIndex=0,hintTimer=null;
window.FDM_TUTORIAL_ACTIVE=false;

function loadTutorialState(){try{return {completed:false,pending:false,seen:{},...JSON.parse(localStorage.getItem(TUTORIAL_KEY)||'{}')}}catch(_){return {completed:false,pending:false,seen:{}}}}
function saveTutorialState(){localStorage.setItem(TUTORIAL_KEY,JSON.stringify(state))}
function hintsEnabled(){return typeof GAME_SETTINGS==='undefined'||GAME_SETTINGS.tutorialHints!==false}
function renderGuide(){const grid=document.getElementById('tutorialGuideGrid');if(grid)grid.innerHTML=GUIDE.map(x=>`<div class="tutorialGuideCard ornate"><span class="guideIcon">${x.icon}</span><h4>${x.title}</h4><p>${x.text}</p></div>`).join('')}
window.openTutorialGuide=function(){renderGuide();showScreen('tutorialScreen')}
window.scheduleInteractiveTutorial=function(){state.pending=true;state.completed=false;saveTutorialState();showScreen('title');if(typeof msg==='function')msg('Tutorial marcado para o próximo duelo.',1000)}
window.resetTutorialProgress=function(){state={completed:false,pending:true,seen:{}};saveTutorialState();if(typeof msg==='function')msg('Tutorial será exibido no próximo duelo.',1000)}

function clearFocus(){document.querySelectorAll('.tutorialFocusPulse').forEach(e=>e.classList.remove('tutorialFocusPulse'))}
function placeTutorial(){
 const overlay=document.getElementById('tutorialOverlay'),coach=document.getElementById('tutorialCoach'),spot=document.getElementById('tutorialSpotlight'),x=DUEL_STEPS[stepIndex];if(!overlay||!x)return;
 document.getElementById('tutorialStepLabel').textContent=`TUTORIAL ${stepIndex+1}/${DUEL_STEPS.length}`;
 document.getElementById('tutorialCoachTitle').textContent=x.title;
 document.getElementById('tutorialCoachText').textContent=x.text;
 document.getElementById('tutorialPrev').disabled=stepIndex===0;
 document.getElementById('tutorialNext').textContent=stepIndex===DUEL_STEPS.length-1?'COMEÇAR DUELO':'PRÓXIMO →';
 clearFocus();
 const target=document.querySelector(x.selector);let r=target?.getBoundingClientRect();
 if(r&&r.width&&r.height){
   target.classList.add('tutorialFocusPulse');const pad=6;spot.style.display='block';spot.style.left=Math.max(4,r.left-pad)+'px';spot.style.top=Math.max(4,r.top-pad)+'px';spot.style.width=Math.min(innerWidth-8,r.width+pad*2)+'px';spot.style.height=Math.min(innerHeight-8,r.height+pad*2)+'px';
 }else spot.style.display='none';
 const mobile=innerWidth<=720;
 if(!mobile&&r){
   const cw=Math.min(430,innerWidth-28),ch=220;let left=r.right+16;if(left+cw>innerWidth-14)left=Math.max(14,r.left-cw-16);let top=Math.max(14,Math.min(innerHeight-ch-14,r.top));coach.style.left=left+'px';coach.style.top=top+'px';coach.style.bottom='auto';
 }else{coach.style.left='14px';coach.style.right='14px';coach.style.bottom='10px';coach.style.top='auto'}
}
window.startInteractiveTutorial=function(force=false){
 if(!force&&(!hintsEnabled()||state.completed&&!state.pending))return;
 if(document.getElementById('duel')?.classList.contains('hidden'))return;
 state.pending=false;saveTutorialState();stepIndex=0;window.FDM_TUTORIAL_ACTIVE=true;document.getElementById('tutorialOverlay')?.classList.remove('hidden');placeTutorial();
}
window.tutorialNextStep=function(){if(!window.FDM_TUTORIAL_ACTIVE)return;if(stepIndex>=DUEL_STEPS.length-1){finishInteractiveTutorial();return}stepIndex++;placeTutorial()}
window.tutorialPrevStep=function(){if(!window.FDM_TUTORIAL_ACTIVE||stepIndex<=0)return;stepIndex--;placeTutorial()}
function finishInteractiveTutorial(){state.completed=true;state.pending=false;saveTutorialState();window.FDM_TUTORIAL_ACTIVE=false;clearFocus();document.getElementById('tutorialOverlay')?.classList.add('hidden');if(typeof msg==='function')msg('Tutorial concluído. Bom duelo!',1000)}
window.skipInteractiveTutorial=function(){state.completed=true;state.pending=false;saveTutorialState();window.FDM_TUTORIAL_ACTIVE=false;clearFocus();document.getElementById('tutorialOverlay')?.classList.add('hidden')}
window.openDuelHelp=function(){window.startInteractiveTutorial(true)}
window.addEventListener('resize',()=>{if(window.FDM_TUTORIAL_ACTIVE)placeTutorial()})

document.addEventListener('keydown',ev=>{
 if(!window.FDM_TUTORIAL_ACTIVE)return;
 if(['ArrowRight','Enter',' '].includes(ev.key)){ev.preventDefault();ev.stopImmediatePropagation();window.tutorialNextStep()}
 else if(ev.key==='ArrowLeft'){ev.preventDefault();ev.stopImmediatePropagation();window.tutorialPrevStep()}
 else if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();window.skipInteractiveTutorial()}
},true);

window.dismissTutorialHint=function(){clearTimeout(hintTimer);document.getElementById('tutorialHint')?.classList.add('hidden')}
window.tutorialHint=function(key,text){
 if(!hintsEnabled()||state.seen[key]||window.FDM_TUTORIAL_ACTIVE)return;state.seen[key]=true;saveTutorialState();const box=document.getElementById('tutorialHint'),out=document.getElementById('tutorialHintText');if(!box||!out)return;out.textContent=text;box.classList.remove('hidden');clearTimeout(hintTimer);hintTimer=setTimeout(window.dismissTutorialHint,6500)
}

// First real duel tutorial: wrap the final loader-level beginDuel implementation.
const baseBeginDuel=window.beginDuel;
if(typeof baseBeginDuel==='function')window.beginDuel=async function(i){const r=await baseBeginDuel(i);setTimeout(()=>{if((!state.completed||state.pending)&&hintsEnabled())window.startInteractiveTutorial()},260);return r};
const baseSecret=window.startSecretDuel;
if(typeof baseSecret==='function')window.startSecretDuel=async function(type){const r=await baseSecret(type);setTimeout(()=>{if(state.pending&&hintsEnabled())window.startInteractiveTutorial()},260);return r};

// Contextual explanations, shown only once each.
const baseFusion=window.toggleFusionMode;
if(typeof baseFusion==='function')window.toggleFusionMode=function(...a){const r=baseFusion(...a);if(fusionMode)window.tutorialHint('fusion','Fusão: selecione de 2 a 5 monstros da mão ou do campo. Combinações descobertas entram automaticamente na Biblioteca de Fusões.');return r};
const basePosition=window.openPositionChoice;
if(typeof basePosition==='function')window.openPositionChoice=function(...a){const r=basePosition(...a);window.tutorialHint('guardian','Guardian Star: escolha uma das duas estrelas ao invocar. Uma vantagem de estrela pode adicionar +500 ao seu combate.');return r};
const baseAttack=window.beginAttack;
if(typeof baseAttack==='function')window.beginAttack=function(...a){const r=baseAttack(...a);window.tutorialHint('attack','Batalha: ATK enfrenta ATK se o alvo estiver atacando, ou DEF se estiver defendendo. Guardian Star e terreno alteram o resultado.');return r};
const baseMagic=window.playMagicCard;
if(typeof baseMagic==='function')window.playMagicCard=function(idx,...rest){const c=S&&S.pHand?C(S.pHand[idx]):null;const r=baseMagic(idx,...rest);if(c?.kind==='trap')window.tutorialHint('trap','Trap: fica preparada na zona de suporte e ativa automaticamente quando sua condição acontece.');else if(c?.kind==='ritual')window.tutorialHint('ritual','Ritual: sacrifica os materiais exigidos e invoca diretamente um monstro ritual.');else if(c?.kind==='terrain')window.tutorialHint('terrain','Terreno: tipos favorecidos recebem +500 e tipos desfavorecidos podem perder 500 em ATK/DEF.');return r};
const baseFinish=window.finish;
if(typeof baseFinish==='function')window.finish=function(...a){const r=baseFinish(...a);setTimeout(()=>window.tutorialHint('ranking','Ranking: POW favorece pressão e vitórias rápidas; TEC recompensa magia, trap, ritual e partidas mais técnicas. Seu ranking também influencia os drops.'),850);return r};

setTimeout(renderGuide,0);
console.info('Forbidden Duel Memories v2.2 tutorial system loaded');
})();
