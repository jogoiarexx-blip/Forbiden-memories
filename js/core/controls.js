/* Forbidden Duel Memories v2.1 — Configurable keyboard + gamepad */
const FDM_INPUT_KEY='fdm_input_v21';
const FDM_INPUT_ACTIONS=[
  ['confirm','Confirmar / Jogar'],['cancel','Cancelar'],['fusion','Fusão'],['attack','Atacar'],
  ['position','Posição'],['endTurn','Fim do turno'],['prevCard','Carta anterior'],['nextCard','Próxima carta']
];
const FDM_DEFAULT_INPUT={
  vibration:true,
  keyboard:{confirm:'j',cancel:'Escape',fusion:'f',attack:'a',position:'p',endTurn:'Enter',prevCard:'ArrowLeft',nextCard:'ArrowRight'},
  gamepad:{confirm:0,cancel:1,fusion:2,attack:3,position:8,endTurn:9,prevCard:4,nextCard:5}
};
let FDM_INPUT=loadInputBindings();
let FDM_CAPTURE_KEY=null;
let FDM_LAST_BUTTONS=[];
let FDM_HAND_CURSOR=0;
window.FDM_CONTROLS_ACTIVE=true;

function cloneInputDefaults(){return JSON.parse(JSON.stringify(FDM_DEFAULT_INPUT))}
function loadInputBindings(){
  try{const x=JSON.parse(localStorage.getItem(FDM_INPUT_KEY)||'{}');return {vibration:x.vibration??true,keyboard:{...FDM_DEFAULT_INPUT.keyboard,...(x.keyboard||{})},gamepad:{...FDM_DEFAULT_INPUT.gamepad,...(x.gamepad||{})}}}catch(_){return cloneInputDefaults()}
}
function saveInputBindings(){localStorage.setItem(FDM_INPUT_KEY,JSON.stringify(FDM_INPUT))}
function setInputOption(key,value){if(key==='vibration'){FDM_INPUT.vibration=!!value;saveInputBindings();syncInputOptionsUI()}}
function resetInputBindings(){FDM_INPUT=cloneInputDefaults();saveInputBindings();syncInputOptionsUI();if(typeof msg==='function')msg('Controles restaurados.',900)}
function prettyKey(k){const map={Escape:'ESC',Enter:'ENTER',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',' ':'ESPAÇO'};return map[k]||String(k).toUpperCase()}
const GAMEPAD_NAMES={0:'A / ✕',1:'B / ○',2:'X / □',3:'Y / △',4:'LB / L1',5:'RB / R1',6:'LT / L2',7:'RT / R2',8:'VIEW / SELECT',9:'MENU / START',10:'L3',11:'R3'};
function syncInputOptionsUI(){
  const vib=document.getElementById('optGamepadVibration');if(vib)vib.checked=!!FDM_INPUT.vibration;
  const kb=document.getElementById('keyboardBindings');
  if(kb)kb.innerHTML=FDM_INPUT_ACTIONS.map(([a,label])=>`<div class="bindingRow"><span>${label}</span><button class="bindButton ${FDM_CAPTURE_KEY===a?'listening':''}" onclick="captureKeyboardBinding('${a}')">${FDM_CAPTURE_KEY===a?'PRESSIONE UMA TECLA':prettyKey(FDM_INPUT.keyboard[a])}</button></div>`).join('');
  const gp=document.getElementById('gamepadBindings');
  if(gp)gp.innerHTML=FDM_INPUT_ACTIONS.map(([a,label])=>`<label class="bindingRow"><span>${label}</span><select onchange="setGamepadBinding('${a}',Number(this.value))">${Object.entries(GAMEPAD_NAMES).map(([i,n])=>`<option value="${i}" ${Number(i)===Number(FDM_INPUT.gamepad[a])?'selected':''}>${n}</option>`).join('')}</select></label>`).join('');
  updateGamepadStatus();
}
function captureKeyboardBinding(action){FDM_CAPTURE_KEY=action;syncInputOptionsUI()}
function setGamepadBinding(action,index){if(action in FDM_INPUT.gamepad){FDM_INPUT.gamepad[action]=Number(index);saveInputBindings();syncInputOptionsUI()}}
function updateGamepadStatus(){
  const out=document.getElementById('gamepadStatus');if(!out)return;
  const pads=navigator.getGamepads?navigator.getGamepads():[];const p=[...pads].find(Boolean);
  out.textContent=p?`Conectado: ${p.id||'Gamepad'}`:'Nenhum controle conectado';out.classList.toggle('connected',!!p);
}
function duelIsVisible(){const d=document.getElementById('duel');return !!(d&&!d.classList.contains('hidden')&&window.S!==null)}
function choiceVisible(){const c=document.getElementById('choice');return !!(c&&!c.classList.contains('hidden'))}
function resultVisible(){const c=document.getElementById('resultModal');return !!(c&&!c.classList.contains('hidden'))}
function storyVisible(){const c=document.getElementById('storyScreen');return !!(c&&!c.classList.contains('hidden'))}
function currentScreen(){return [...document.querySelectorAll('.screen')].find(e=>!e.classList.contains('hidden'))}
function pulseGamepad(strong=.25,weak=.15,duration=90){
  if(!FDM_INPUT.vibration||!navigator.getGamepads)return;const p=[...navigator.getGamepads()].find(Boolean),a=p?.vibrationActuator;if(!a)return;
  try{if(a.playEffect)a.playEffect('dual-rumble',{duration,strongMagnitude:strong,weakMagnitude:weak});else if(a.pulse)a.pulse(Math.max(strong,weak),duration)}catch(_){}
}
function cycleHand(delta){
  if(!duelIsVisible()||!S?.pHand?.length||S.side!=='p')return;
  FDM_HAND_CURSOR=(FDM_HAND_CURSOR+delta+S.pHand.length)%S.pHand.length;handTap(FDM_HAND_CURSOR);
}
function cancelDuelAction(){
  if(!duelIsVisible())return false;
  if(choiceVisible()){document.getElementById('choice').classList.add('hidden');return true}
  if(attackMode){attackMode=false;renderAll();msg('Ataque cancelado.',500);return true}
  if(fusionMode){fusionMode=false;fusionSel=[];if(typeof fusionFieldSel!=='undefined')fusionFieldSel=[];renderAll();msg('Fusão cancelada.',500);return true}
  if(S.selectedHand!==null||S.selectedField!==null){S.selectedHand=null;S.selectedField=null;renderAll();return true}
  return false;
}
function doInputAction(action,source='keyboard'){
  if(window.FDM_TUTORIAL_ACTIVE){
    if(action==='confirm'){window.tutorialNextStep?.();return true}
    if(action==='cancel'){window.skipInteractiveTutorial?.();return true}
    if(action==='prevCard'){window.tutorialPrevStep?.();return true}
    return true;
  }
  if(choiceVisible()){
    const buttons=[...document.querySelectorAll('#choiceButtons button:not(:disabled)')];
    if(action==='confirm'&&buttons.length){buttons[0].click();pulseGamepad();return true}
    if(action==='cancel'){document.getElementById('choice').classList.add('hidden');return true}
  }
  if(resultVisible()){
    if(action==='confirm'){document.querySelector('#resultModal .bigChoice')?.click();return true}
    if(action==='cancel'){document.querySelectorAll('#resultModal .bigChoice')[1]?.click();return true}
  }
  if(storyVisible()){
    if(action==='confirm'){const b=document.getElementById('storyNext');if(b&&b.style.display!=='none')b.click();return true}
    if(action==='cancel'){document.getElementById('storySkip')?.click();return true}
  }
  if(duelIsVisible()&&S&&!S.over){
    if(S.side!=='p'&&action!=='cancel')return false;
    switch(action){
      case 'prevCard':cycleHand(-1);return true;
      case 'nextCard':cycleHand(1);return true;
      case 'confirm':playSelection();pulseGamepad(.12,.08,50);return true;
      case 'cancel':return cancelDuelAction();
      case 'fusion':toggleFusionMode();pulseGamepad(.12,.08,60);return true;
      case 'attack':beginAttack();pulseGamepad(.18,.10,70);return true;
      case 'position':changePosition();return true;
      case 'endTurn':endTurn();return true;
    }
  }
  return false;
}
function focusablesInActiveLayer(){
  let root=choiceVisible()?document.getElementById('choice'):resultVisible()?document.getElementById('resultModal'):storyVisible()?document.getElementById('storyScreen'):currentScreen();
  if(!root)return[];return [...root.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(e=>e.offsetParent!==null);
}
function menuNavigate(delta){
  const items=focusablesInActiveLayer();if(!items.length)return;let i=items.indexOf(document.activeElement);i=i<0?0:(i+delta+items.length)%items.length;items[i].focus({preventScroll:false});items[i].scrollIntoView?.({block:'nearest'});
}
function menuConfirm(){const e=document.activeElement;if(e&&focusablesInActiveLayer().includes(e)){if(e.tagName==='SELECT')return;e.click();return}const first=focusablesInActiveLayer()[0];first?.focus();first?.click()}
function menuBack(){
  if(choiceVisible()){document.getElementById('choice').classList.add('hidden');return}
  if(resultVisible()){document.querySelectorAll('#resultModal .bigChoice')[1]?.click();return}
  if(storyVisible()){document.getElementById('storySkip')?.click();return}
  const screen=currentScreen();if(!screen||screen.id==='title')return;const back=screen.querySelector('.topbar .iconbtn');if(back)back.click();else showScreen('title');
}

document.addEventListener('keydown',ev=>{
  if(FDM_CAPTURE_KEY){ev.preventDefault();ev.stopImmediatePropagation();FDM_INPUT.keyboard[FDM_CAPTURE_KEY]=ev.key;FDM_CAPTURE_KEY=null;saveInputBindings();syncInputOptionsUI();return}
  const action=Object.keys(FDM_INPUT.keyboard).find(a=>FDM_INPUT.keyboard[a]===ev.key||String(FDM_INPUT.keyboard[a]).toLowerCase()===ev.key.toLowerCase());
  if(action&&duelIsVisible()){ev.preventDefault();ev.stopImmediatePropagation();doInputAction(action,'keyboard');return}
  // Keyboard navigation outside duel.
  if(!duelIsVisible()&&['ArrowUp','ArrowDown'].includes(ev.key)){ev.preventDefault();menuNavigate(ev.key==='ArrowDown'?1:-1)}
},true);

window.addEventListener('gamepadconnected',()=>{updateGamepadStatus();pulseGamepad(.15,.08,80)});
window.addEventListener('gamepaddisconnected',updateGamepadStatus);

function pollGamepads(){
  const pads=navigator.getGamepads?navigator.getGamepads():[],p=[...pads].find(Boolean);
  if(p){
    const pressed=p.buttons.map(b=>!!b.pressed);
    const just=i=>pressed[i]&&!FDM_LAST_BUTTONS[i];
    if(duelIsVisible()||choiceVisible()||resultVisible()||storyVisible()){
      for(const [action,index] of Object.entries(FDM_INPUT.gamepad))if(just(Number(index)))doInputAction(action,'gamepad');
      if(just(14))doInputAction('prevCard','gamepad');if(just(15))doInputAction('nextCard','gamepad');
      if(!duelIsVisible()){if(just(12))menuNavigate(-1);if(just(13))menuNavigate(1)}
    }else{
      if(just(12)||just(14))menuNavigate(-1);if(just(13)||just(15))menuNavigate(1);
      if(just(Number(FDM_INPUT.gamepad.confirm)))menuConfirm();
      if(just(Number(FDM_INPUT.gamepad.cancel)))menuBack();
    }
    FDM_LAST_BUTTONS=pressed;
  }else FDM_LAST_BUTTONS=[];
  requestAnimationFrame(pollGamepads);
}
requestAnimationFrame(pollGamepads);

// Haptic feedback hooks for the most important duel events.
const _fdmControlsFusion=window.playFusionCinematic;
if(typeof _fdmControlsFusion==='function')window.playFusionCinematic=function(...args){pulseGamepad(.45,.25,180);return _fdmControlsFusion(...args)};
const _fdmControlsBattle=window.playBattleCinematic;
if(typeof _fdmControlsBattle==='function')window.playBattleCinematic=function(...args){pulseGamepad(.35,.20,120);return _fdmControlsBattle(...args)};

const _fdmOpenOptionsControls=window.openOptions;
if(typeof _fdmOpenOptionsControls==='function')window.openOptions=function(){const r=_fdmOpenOptionsControls();setTimeout(syncInputOptionsUI,0);return r};

setTimeout(syncInputOptionsUI,0);
console.info('Forbidden Duel Memories v2.1 configurable controls loaded');
