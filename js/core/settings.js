/* Forbidden Duel Memories v2.0 — Settings & performance manager */
const FDM_SETTINGS_KEY='fdm_settings_v2';
const FDM_DEFAULT_SETTINGS={
  graphics:'auto', resolution:'auto', effects:'medium', glow:true, reducedMotion:false,
  performance:'balanced', fps:'auto', animationSpeed:'normal',
  masterVolume:100, sfxVolume:70, musicVolume:60, muted:false, tutorialHints:true
};
let GAME_SETTINGS=loadGameSettings();
let FDM_MUSIC=[];

function loadGameSettings(){
  try{return {...FDM_DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(FDM_SETTINGS_KEY)||'{}')}}catch(_){return {...FDM_DEFAULT_SETTINGS}}
}
function saveGameSettings(){localStorage.setItem(FDM_SETTINGS_KEY,JSON.stringify(GAME_SETTINGS))}
function detectHardwareProfile(){
  const cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||4,pixels=(screen.width||1280)*(screen.height||720),reduce=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  let score=0;if(cores>=8)score+=2;else if(cores>=4)score+=1;if(mem>=8)score+=2;else if(mem>=4)score+=1;if(pixels<=1600000)score+=1;if(reduce)score-=1;
  const tier=score>=5?'high':score>=3?'medium':'low';
  return {tier,cores,mem,pixels,reduce};
}
function resolvedGraphics(){
  if(GAME_SETTINGS.performance==='economy')return 'low';
  if(GAME_SETTINGS.performance==='quality'&&GAME_SETTINGS.graphics==='auto')return 'high';
  if(GAME_SETTINGS.graphics!=='auto')return GAME_SETTINGS.graphics;
  return detectHardwareProfile().tier;
}
function resolvedResolution(){
  if(GAME_SETTINGS.resolution!=='auto')return GAME_SETTINGS.resolution;
  const tier=resolvedGraphics();return tier==='low'?'720':tier==='medium'?'900':'1080';
}
function resolvedFPS(){
  if(GAME_SETTINGS.fps!=='auto')return Number(GAME_SETTINGS.fps);
  return resolvedGraphics()==='low'?30:60;
}
function updateAudioVolumes(){
  const master=GAME_SETTINGS.muted?0:Math.max(0,Math.min(1,GAME_SETTINGS.masterVolume/100));
  const sfx=master*Math.max(0,Math.min(1,GAME_SETTINGS.sfxVolume/100));
  Object.values(SFX||{}).forEach(a=>{try{a.volume=sfx}catch(_){}});
  const music=master*Math.max(0,Math.min(1,GAME_SETTINGS.musicVolume/100));
  FDM_MUSIC.forEach(a=>{try{a.volume=music}catch(_){}});
}
function applyGameSettings(){
  const root=document.documentElement,body=document.body,g=resolvedGraphics(),r=resolvedResolution(),fps=resolvedFPS();
  body.dataset.graphics=g;body.dataset.effects=GAME_SETTINGS.effects;body.dataset.performance=GAME_SETTINGS.performance;body.dataset.fps=String(fps);body.dataset.resolution=r;body.dataset.animSpeed=GAME_SETTINGS.animationSpeed;
  body.classList.toggle('noGlow',!GAME_SETTINGS.glow);
  body.classList.toggle('reduceMotion',GAME_SETTINGS.reducedMotion||fps===30);
  const scale=r==='720'?.88:r==='900'?.95:1;root.style.setProperty('--fdm-ui-scale',String(scale));
  const anim=GAME_SETTINGS.animationSpeed==='fast'?.7:GAME_SETTINGS.animationSpeed==='cinematic'?1.35:1;root.style.setProperty('--fdm-anim-speed',String(anim));
  updateAudioVolumes();
  syncOptionsUI();
}
function setGameSetting(key,value){
  if(!(key in FDM_DEFAULT_SETTINGS))return;GAME_SETTINGS[key]=value;saveGameSettings();applyGameSettings();
}
function syncOptionsUI(){
  const map={optGraphics:'graphics',optResolution:'resolution',optEffects:'effects',optGlow:'glow',optReducedMotion:'reducedMotion',optPerformance:'performance',optFps:'fps',optAnimSpeed:'animationSpeed',optMasterVolume:'masterVolume',optSfxVolume:'sfxVolume',optMusicVolume:'musicVolume',optMuted:'muted',optTutorialHints:'tutorialHints'};
  Object.entries(map).forEach(([id,key])=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox')e.checked=!!GAME_SETTINGS[key];else e.value=String(GAME_SETTINGS[key])});
  [['masterVolumeOut','masterVolume'],['sfxVolumeOut','sfxVolume'],['musicVolumeOut','musicVolume']].forEach(([id,key])=>{let e=document.getElementById(id);if(e)e.textContent=Math.round(GAME_SETTINGS[key])+'%'});
  const hw=detectHardwareProfile(),label={low:'FRACO',medium:'MÉDIO',high:'FORTE'}[hw.tier];let p=document.getElementById('hardwareProfile'),d=document.getElementById('hardwareDetail');if(p)p.textContent=`${label} • Automático: ${resolvedGraphics().toUpperCase()} / ${resolvedResolution()}p / ${resolvedFPS()} FPS`;if(d)d.textContent=`CPU: ${hw.cores} threads • RAM estimada: ${hw.mem} GB • Tela: ${screen.width}×${screen.height}`;
  updateFullscreenButton();
}
function openOptions(){syncOptionsUI();showScreen('optionsScreen')}
function closeOptions(){saveGameSettings();applyGameSettings();showScreen('title')}
function resetGameSettings(){GAME_SETTINGS={...FDM_DEFAULT_SETTINGS};saveGameSettings();applyGameSettings();syncOptionsUI();if(typeof msg==='function')msg('Opções restauradas.',900)}
async function toggleGameFullscreen(){
  try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch(e){console.warn('Fullscreen indisponível',e)}updateFullscreenButton();
}
function updateFullscreenButton(){let b=document.getElementById('fullscreenBtn');if(b)b.textContent=document.fullscreenElement?'DESATIVAR':'ATIVAR'}
document.addEventListener('fullscreenchange',updateFullscreenButton);
function testGameAudio(){updateAudioVolumes();let a=SFX?.summon;if(!a)return;try{a.currentTime=0;a.play().catch(()=>{})}catch(_){}}

// Keep future background-music tracks on the same audio bus.
function registerGameMusic(audio){if(audio&&!FDM_MUSIC.includes(audio)){FDM_MUSIC.push(audio);updateAudioVolumes()}return audio}

// Override SFX playback so mute/volumes are honored even after lazy loading.
const _fdmPlaySfxBase=playSfx;
playSfx=function(name){updateAudioVolumes();return _fdmPlaySfxBase(name)};

applyGameSettings();
console.info('Forbidden Duel Memories v2.0 settings loaded',GAME_SETTINGS);
