/* Forbidden Duel Memories v1.6 — Smart loading system
   Loads menus, stories and duel packages on demand with visible progress. */
const LOADER_VERSION='1.8';

(function(){
const LOAD_STATE={busy:false, cache:{}};
let deckFilterBound=false;

function v16Sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function v16Frame(){return new Promise(r=>requestAnimationFrame(()=>r()));}
function v16Overlay(){return document.getElementById('loadingOverlay')}
function v16SetLoader(title,step,pct,hint=''){
  const overlay=v16Overlay();
  if(!overlay)return;
  document.body.classList.add('loadingLock');
  overlay.classList.remove('hidden');
  const t=document.getElementById('loadingTitle'),s=document.getElementById('loadingStep'),b=document.getElementById('loadingBar'),p=document.getElementById('loadingPercent'),h=document.getElementById('loadingHint');
  if(t)t.textContent=title||'CARREGANDO';
  if(s)s.textContent=step||'Preparando recursos...';
  if(b)b.style.width=Math.max(0,Math.min(100,pct||0))+'%';
  if(p)p.textContent=Math.round(Math.max(0,Math.min(100,pct||0)))+'%';
  if(h&&hint)h.textContent=hint;
}
function v16HideLoader(){
  const overlay=v16Overlay();
  document.body.classList.remove('loadingLock');
  if(overlay)overlay.classList.add('hidden');
}
async function v16RunLoading(config,steps,finalize){
  if(LOAD_STATE.busy)return;
  const cfg={title:'CARREGANDO',hint:'Os recursos são carregados sob demanda.',cacheKey:'',force:false,minStep:110,...(config||{})};
  if(cfg.cacheKey && LOAD_STATE.cache[cfg.cacheKey] && !cfg.force){
    if(finalize)return await finalize();
    return;
  }
  LOAD_STATE.busy=true;
  try{
    v16SetLoader(cfg.title,steps[0]?.label||'Preparando recursos...',4,cfg.hint);
    await v16Frame();
    for(let i=0;i<steps.length;i++){
      const pct=Math.round(((i)/(Math.max(1,steps.length)))*100);
      v16SetLoader(cfg.title,steps[i].label,pct,cfg.hint);
      await v16Frame();
      const t0=performance.now();
      if(steps[i].run)await steps[i].run();
      const elapsed=performance.now()-t0;
      if(elapsed<cfg.minStep)await v16Sleep(cfg.minStep-elapsed);
    }
    v16SetLoader(cfg.title,'Concluído.',100,cfg.hint);
    if(finalize)await finalize();
    if(cfg.cacheKey)LOAD_STATE.cache[cfg.cacheKey]=true;
    await v16Sleep(120);
  }catch(err){
    console.error('v1.6 loader error',err);
    if(typeof msg==='function')msg('Falha ao carregar recursos.',1800);
  }finally{
    v16HideLoader();
    LOAD_STATE.busy=false;
  }
}
async function v16PreloadAudio(keys){
  const jobs=(keys||[]).filter(Boolean).map(k=>new Promise(resolve=>{
    const a=SFX?.[k];
    if(!a)return resolve();
    let done=false;
    const finish=()=>{if(done)return;done=true;resolve();};
    try{
      if(a.readyState>=2)return finish();
      a.preload='auto';
      a.addEventListener('canplaythrough',finish,{once:true});
      a.addEventListener('error',finish,{once:true});
      a.load();
      setTimeout(finish,250);
    }catch(_){finish();}
  }));
  await Promise.all(jobs);
}
function v16BindDeckFilters(){
  if(deckFilterBound)return;
  deckFilterBound=true;
  document.querySelectorAll('#deckFilters .filterBtn').forEach(b=>b.onclick=()=>{deckFilter=b.dataset.filter;renderDeck()});
}
function v16ResetDuelTransientState(){
  fusionMode=false;fusionSel=[];if(typeof fusionFieldSel!=='undefined')fusionFieldSel=[];attackMode=false;shownPLP=8000;shownELP=8000;
}
function v16FinalizeDuelScreen(enemyName,enemyIcon,startMsg){
  document.getElementById('enemyName').textContent=enemyName;
  document.getElementById('enemyPortrait').textContent=enemyIcon;
  showScreen('duel');
  renderAll();
  msg(startMsg,900);
}

const v16OpenOpponentBase=openOpponent;
openOpponent=async function(){
  if(!save.storyPrologue)return v16OpenOpponentBase();
  return v16RunLoading({title:'CARREGANDO CAMPANHA',cacheKey:'menu:campaign',force:true,hint:'Mapa, progresso e duelistas são montados apenas quando você abre a campanha.'},[
    {label:'Lendo seu progresso de campanha...',run:()=>{save.unlocked;save.campaignWins;}},
    {label:'Montando o mapa e os duelistas da região atual...',run:()=>renderOpponents()},
    {label:'Preparando painel de confronto...',run:()=>selectCampaignOpponent(Math.min(Math.max(1,save.unlocked||1)-1,OPP.length-1),false)}
  ],()=>showScreen('opponents'));
};

const v16OpenDeckBase=openDeck;
openDeck=async function(){
  return v16RunLoading({title:'CARREGANDO DECK',cacheKey:'menu:deck',force:true,hint:'A coleção e os filtros são processados apenas ao abrir o editor de deck.'},[
    {label:'Lendo sua coleção e a lista do deck atual...',run:()=>{save.collection;save.deck;}},
    {label:'Montando filtros de cartas...',run:()=>v16BindDeckFilters()},
    {label:'Renderizando a biblioteca visual do deck...',run:()=>renderDeck()}
  ],()=>showScreen('deckScreen'));
};

const v16OpenRecordsBase=openRecords;
openRecords=async function(){
  return v16RunLoading({title:'CARREGANDO REGISTROS',cacheKey:'menu:records',force:true,hint:'As estatísticas são atualizadas apenas quando você consulta seus registros.'},[
    {label:'Calculando estatísticas de vitórias, derrotas e coleção...',run:()=>{}},
    {label:'Atualizando progresso da biblioteca de fusões...',run:()=>fusionDiscoveryStats()},
    {label:'Montando o painel de registros...',run:()=>v16OpenRecordsBase()}
  ]);
};

const v16OpenFusionLibraryBase=openFusionLibrary;
openFusionLibrary=async function(){
  return v16RunLoading({title:'CARREGANDO BIBLIOTECA DE FUSÕES',cacheKey:'menu:fusions',force:true,hint:'A biblioteca carrega somente ao abrir esse menu, com paginação para não pesar.'},[
    {label:'Lendo receitas registradas e descobertas...',run:()=>{V15_UNIQUE_RECIPES.length;fusionDiscoveryStats();}},
    {label:'Aplicando filtro atual da biblioteca...',run:()=>v15FilteredRecipes().length},
    {label:'Renderizando a página atual de fusões...',run:()=>v16OpenFusionLibraryBase()}
  ]);
};

const v16OpenFreeDuelBase=openFreeDuel;
openFreeDuel=async function(){
  return v16RunLoading({title:'CARREGANDO DUELO LIVRE',cacheKey:'menu:freeDuel',force:true,hint:'Os oponentes disponíveis para duelo livre são gerados sob demanda.'},[
    {label:'Verificando duelistas já encontrados...',run:()=>Math.min(OPP.length,Math.max(1,save.unlocked||1))},
    {label:'Montando a lista de adversários do duelo livre...',run:()=>v16OpenFreeDuelBase()}
  ]);
};

const v16OpenPasswordShopBase=openPasswordShop;
openPasswordShop=async function(){
  return v16RunLoading({title:'CARREGANDO CARD SHOP',cacheKey:'menu:shop',force:true,hint:'O terminal de senhas só é preparado quando esse menu é aberto.'},[
    {label:'Sincronizando suas estrelas disponíveis...',run:()=>save.stars},
    {label:'Iniciando o terminal de cartas...',run:()=>v16OpenPasswordShopBase()}
  ]);
};

const v16PlayStoryBase=playStory;
playStory=async function(key,done=null,title=''){
  return v16RunLoading({title:'CARREGANDO CENA',cacheKey:'story:'+key,force:true,minStep:90,hint:'Diálogos, retratos e efeitos da cena são preparados antes da exibição.'},[
    {label:'Localizando roteiro da cena...',run:()=>{storyQueue=[];return (STORY[key]||[]).length;}},
    {label:'Carregando retratos e atmosfera narrativa...',run:()=>v16PreloadAudio(['story'])},
    {label:'Abrindo a sequência de diálogo...',run:()=>v16PlayStoryBase(key,done,title)}
  ]);
};

function v16BuildMainDuel(opponent,extra={}){
  const pdeck=makeDeck(save.deck,true);if(!pdeck)throw new Error('invalid player deck');
  let edeck=makeDeck(opponent.deck);
  S=v13DuelState(pdeck,edeck,opponent,extra||{});
  drawUntilFive('p',false);
  drawUntilFive('e',false);
  v16ResetDuelTransientState();
}

beginDuel=async function(i){
  currentOpponent=i;
  const o=OPP[i];
  if(!o)return;
  if(!validatePlayerDeck(false))return openDeck();
  if(o.boss)playSfx('boss');
  return v16RunLoading({title:freeDuelMode?'CARREGANDO DUELO LIVRE':'CARREGANDO ETAPA '+(o.stage||i+1),force:true,minStep:130,hint:'Cada duelo monta apenas o deck, campo, sons e recursos necessários para esta etapa.'},[
    {label:'Validando o deck do duelista...',run:()=>{if(!validatePlayerDeck(false))throw new Error('deck inválido');}},
    {label:'Embaralhando o seu deck...',run:()=>{const p=makeDeck(save.deck,true);if(!p)throw new Error('deck inválido');}},
    {label:'Carregando arquivo do baralho de '+o.name+'...',run:()=>window.ensureEnemyDeckLoaded?window.ensureEnemyDeckLoaded(i):null},
    {label:'Montando pool mínimo de cartas desta partida...',run:()=>window.prepareDuelCardPool?window.prepareDuelCardPool(save.deck,o.deck,o):null},
    {label:'Preparando o deck de '+o.name+'...',run:()=>makeDeck(o.deck)},
    {label:'Carregando o terreno '+String(o.terrain||'Neutro').toUpperCase()+'...',run:()=>{applyTerrainVisual?.();}},
    {label:'Pré-carregando sons e efeitos do duelo...',run:()=>v16PreloadAudio(['summon','attack','destroy','magic','fusion',o.boss?'boss':null])},
    {label:'Comprando as mãos iniciais...',run:()=>v16BuildMainDuel(o)},
    {label:'Montando o campo desta etapa...',run:()=>v16FinalizeDuelScreen(o.name,o.icon,'DUEL START!')}
  ],async()=>{ if(!S)await openDeck(); });
};

startSecretDuel=async function(type){
  const secret={
    canyon:{name:'Duelista Errante',icon:'🦂',rank:8,stars:5,ai:.72,terrain:'Desfiladeiro',bonus:['Trevas','Terra'],deck:[45,51,60,61,62,33,34,37,302,311,312,324]}
  }[type];
  if(!secret||!validatePlayerDeck(false))return openDeck();
  freeDuelMode=false;currentOpponent=-1;
  return v16RunLoading({title:'CARREGANDO DUELO SECRETO',force:true,minStep:135,hint:'Eventos secretos também usam carregamento sob demanda para não pesar o jogo inteiro.'},[
    {label:'Validando seu deck para o evento secreto...',run:()=>{const p=makeDeck(save.deck,true);if(!p)throw new Error('deck inválido');}},
    {label:'Selando o cenário oculto do '+secret.terrain+'...',run:()=>{}},
    {label:'Preparando o deck do duelista secreto...',run:()=>makeDeck(secret.deck)},
    {label:'Montando pool mínimo de cartas do evento...',run:()=>window.prepareDuelCardPool?window.prepareDuelCardPool(save.deck,secret.deck,secret):null},
    {label:'Pré-carregando efeitos e sons especiais...',run:()=>v16PreloadAudio(['summon','attack','destroy','magic','fusion'])},
    {label:'Comprando as mãos iniciais...',run:()=>v16BuildMainDuel(secret,{secretType:type})},
    {label:'Abrindo o confronto secreto...',run:()=>v16FinalizeDuelScreen(secret.name,secret.icon,'DUELO SECRETO!')}
  ]);
};

const v16NewSaveBase=newSave;
newSave=function(){
  LOAD_STATE.cache={};
  return v16NewSaveBase();
};

persist();
setTimeout(()=>{
  v16RunLoading({title:'INICIALIZANDO',cacheKey:'boot',force:true,minStep:90,hint:'O jogo prepara somente o núcleo principal na inicialização; menus e duelos carregam depois, sob demanda.'},[
    {label:'Lendo banco de cartas e regras principais...',run:()=>DB.length+FUS.length},
    {label:'Sincronizando save, coleção e progressão...',run:()=>{v15EnsureSave?.();save.deck?.length;}},
    {label:'Preparando tela inicial...',run:()=>{updateNGPlusButton?.();showScreen('title');}}
  ]);
},0);

console.info('Forbidden Duel Memories v1.8 smart loading loaded');
})();
