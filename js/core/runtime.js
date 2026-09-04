/* Forbidden Duel Memories v1.7 — PS1 Loading + Duel Card Pool + Lazy Enemy Decks */
const V18_RUNTIME_VERSION='1.8';
const V17_FULL_C=C;
let V17_DUEL_CARD_MAP=null;
let V17_DUEL_POOL_INFO=null;
let V17_ACTIVE_ENEMY_KEY=null;
window.FDM_ENEMY_DECKS=window.FDM_ENEMY_DECKS||Object.create(null);

function v17FullCard(id){return V17_FULL_C(Number(id))||null}
function v17AddCard(map,id){const c=v17FullCard(id);if(c)map.set(c.id,c);return c}

// During a duel, all normal card lookups use the compact Map rather than DB.find().
C=function(id){
  const n=Number(id);
  if(!V17_DUEL_CARD_MAP)return V17_FULL_C(n);
  if(V17_DUEL_CARD_MAP.has(n))return V17_DUEL_CARD_MAP.get(n);
  // Strict duel pool: cards outside this match are intentionally unavailable.
  return null;
};

function v17PotentialTechIds(rank=0){
  const ids=[];
  if(rank>=4)ids.push(604);
  if(rank>=7)ids.push(602);
  if(rank>=10)ids.push(603);
  if(rank>=13)ids.push(601);
  if(rank>=15)ids.push(611+(rank%4));
  return ids;
}

function prepareDuelCardPool(playerDeck,enemyDeck,profile={}){
  // Build with unrestricted lookup, then lock the duel to the compact map.
  V17_DUEL_CARD_MAP=null;
  const map=new Map(),playerIds=new Set((playerDeck||[]).map(Number)),enemyIds=new Set((enemyDeck||[]).map(Number));
  playerIds.forEach(id=>v17AddCard(map,id));
  enemyIds.forEach(id=>v17AddCard(map,id));

  // Ritual results are needed only if the ritual itself is in one of these decks.
  [...map.values()].forEach(c=>{if(c?.kind==='ritual'&&c.result)v17AddCard(map,c.result)});

  // Exact recipe closure among cards that can actually exist in this match.
  // This also catches chained hand-authored fusion results.
  let changed=true,rounds=0;
  while(changed&&rounds<8){
    changed=false;rounds++;
    const ids=[...map.keys()];
    for(const recipe of FUS){
      const a=recipe?.[0]?.[0],b=recipe?.[0]?.[1],r=recipe?.[1];
      if(map.has(a)&&map.has(b)&&!map.has(r)){if(v17AddCard(map,r))changed=true}
    }
    // Resolve generated v1.4 recipes only between cards already reachable.
    // Limit pair work to monsters and stop after closure stabilizes.
    const mons=ids.map(v17FullCard).filter(c=>c&&c.kind==='monster');
    for(let i=0;i<mons.length;i++)for(let j=i+1;j<mons.length;j++){
      const out=typeof v14ResolveRecipe==='function'?v14ResolveRecipe(mons[i].id,mons[j].id):null;
      if(out&&!map.has(out)){if(v17AddCard(map,out))changed=true}
    }
  }

  V17_DUEL_CARD_MAP=map;
  V17_DUEL_POOL_INFO={
    playerUnique:playerIds.size,
    enemyUnique:enemyIds.size,
    activeCards:map.size,
    fullCatalog:DB.length,
    lazyLoads:0,
    opponent:profile.name||'Duelista'
  };
  save.gameVersion=V18_RUNTIME_VERSION;
  console.info('v1.8 duel card pool ready',V17_DUEL_POOL_INFO);
  const hint=document.getElementById('loadingHint');
  if(hint)hint.textContent=`Pool ativo: ${map.size} cartas necessárias nesta partida (catálogo completo: ${DB.length}).`;
  return V17_DUEL_POOL_INFO;
}
window.prepareDuelCardPool=prepareDuelCardPool;

function releaseDuelCardPool(){
  if(V17_DUEL_CARD_MAP)console.info('v1.8 duel card pool released',V17_DUEL_POOL_INFO);
  V17_DUEL_CARD_MAP=null;V17_DUEL_POOL_INFO=null;
}
window.releaseDuelCardPool=releaseDuelCardPool;

function v17LoadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;s.async=true;s.dataset.lazyDeck='1';
    s.onload=()=>{s.remove();resolve()};
    s.onerror=()=>{s.remove();reject(new Error('Falha ao carregar '+src))};
    document.head.appendChild(s);
  });
}
async function ensureEnemyDeckLoaded(i){
  const o=OPP[i];if(!o)return [];
  const key=o.deckKey||('opp'+String(i+1).padStart(2,'0'));
  if(Array.isArray(o.deck)&&o.deck.length)return o.deck;

  // Keep only the deck used by the next/current campaign duel in live memory.
  for(const other of OPP){
    if(other!==o&&other.deckKey){delete other.deck;delete window.FDM_ENEMY_DECKS[other.deckKey]}
  }
  if(!window.FDM_ENEMY_DECKS[key])await v17LoadScript(o.deckFile||`js/content/decks/${key}.js`);
  const loaded=window.FDM_ENEMY_DECKS[key];
  if(!Array.isArray(loaded)||!loaded.length)throw new Error('Baralho inimigo vazio: '+key);
  o.deck=loaded.slice();V17_ACTIVE_ENEMY_KEY=key;
  return o.deck;
}
window.ensureEnemyDeckLoaded=ensureEnemyDeckLoaded;

function releaseEnemyDeck(){
  if(!V17_ACTIVE_ENEMY_KEY)return;
  const o=OPP.find(x=>x.deckKey===V17_ACTIVE_ENEMY_KEY);
  if(o)delete o.deck;
  delete window.FDM_ENEMY_DECKS[V17_ACTIVE_ENEMY_KEY];
  V17_ACTIVE_ENEMY_KEY=null;
}

// Menus use the full catalog; compact lookup lives only inside the duel/result flow.
const v17ShowScreenBase=showScreen;
showScreen=function(id){
  if(id!=='duel')releaseDuelCardPool();
  return v17ShowScreenBase(id);
};

const v17ReturnAfterDuelBase=returnAfterDuel;
returnAfterDuel=function(){
  const r=v17ReturnAfterDuelBase();
  releaseEnemyDeck();
  return r;
};

// Going straight to title from result also unloads the opponent deck.
document.addEventListener('click',ev=>{
  const b=ev.target.closest?.('#resultModal .bigChoice');
  if(b&&/MENU/.test(b.textContent||''))setTimeout(releaseEnemyDeck,0);
});

// Full fusion recipes are materialized by v1.6's visible menu loading steps.

save.gameVersion=V18_RUNTIME_VERSION;persist();
console.info('Forbidden Duel Memories v1.8 runtime loaded',{cards:DB.length,opponents:OPP.length});


/* v1.8 strict lifecycle: release compact lookup before reward/result code. */
const v18FinishBase=finish;
finish=function(win,reason=''){
  releaseDuelCardPool();
  return v18FinishBase(win,reason);
};

function activeDuelPoolInfo(){return V17_DUEL_POOL_INFO?{...V17_DUEL_POOL_INFO}:null}
window.activeDuelPoolInfo=activeDuelPoolInfo;
