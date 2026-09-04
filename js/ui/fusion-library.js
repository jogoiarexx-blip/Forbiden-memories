/* Forbidden Duel Memories v1.5 — Fusion Discovery Library
   Records player discoveries and provides a lightweight searchable fusion codex. */
const V15_VERSION='1.5';

function v15RecipeKey(a,b){return [Number(a),Number(b)].sort((x,y)=>x-y).join(':')}
function v15EnsureSave(){
  if(!save.fusionDiscoveries || typeof save.fusionDiscoveries!=='object') save.fusionDiscoveries={};
  if(!save.fusionDiscoveryOrder || !Array.isArray(save.fusionDiscoveryOrder)) save.fusionDiscoveryOrder=[];
  if(save.fusionLibrarySeen===undefined) save.fusionLibrarySeen=false;
  save.gameVersion=V15_VERSION;
}
v15EnsureSave();

let V15_UNIQUE_RECIPES=[];
let V15_RECIPE_BY_KEY=new Map();
let V15_RECIPE_INDEX_READY=false;
function v15EnsureRecipeIndex(){
  if(V15_RECIPE_INDEX_READY)return;
  if(typeof ensureFullFusionLibrary==='function')ensureFullFusionLibrary();
  const m=new Map();
  for(const r of FUS){
    if(!r||!r[0]||r[0].length<2)continue;
    const key=v15RecipeKey(r[0][0],r[0][1]);
    if(!m.has(key))m.set(key,{key,a:r[0][0],b:r[0][1],result:r[1]});
  }
  V15_UNIQUE_RECIPES=[...m.values()].sort((x,y)=>{
    const A=C(x.result),B=C(y.result);return ((A?.a||0)-(B?.a||0))||(x.a-y.a)||(x.b-y.b);
  });
  V15_RECIPE_BY_KEY=new Map(V15_UNIQUE_RECIPES.map(r=>[r.key,r]));
  V15_RECIPE_INDEX_READY=true;
}

function registerFusionDiscovery(a,b,result){
  // v1.7: record by IDs immediately; do not materialize the 6k recipe index during a duel.
  const key=v15RecipeKey(a,b);
  const first=!save.fusionDiscoveries[key];
  save.fusionDiscoveries[key]={result,at:Date.now()};
  if(first){save.fusionDiscoveryOrder.push(key);persist();}
  return first;
}
function fusionDiscoveryStats(){
  v15EnsureSave();v15EnsureRecipeIndex();
  const discovered=Object.keys(save.fusionDiscoveries).filter(k=>V15_RECIPE_BY_KEY.has(k)).length;
  const total=V15_UNIQUE_RECIPES.length;
  return {discovered,total,pct:total?Math.floor(discovered*10000/total)/100:0};
}

// Player chain resolver now records every successful step, including chained results.
function chainFusionDetailed(ids){
  if(ids.length<2)return {id:ids[0]||null,made:false,steps:[]};
  let cur=ids[0],made=false;const steps=[];
  for(let i=1;i<ids.length;i++){
    const next=ids[i],r=findFusion(cur,next);
    if(r){
      const fresh=registerFusionDiscovery(cur,next,r);
      steps.push({a:cur,b:next,result:r,newDiscovery:fresh});
      cur=r;made=true;
    }else cur=next;
  }
  return {id:cur,made,steps};
}
function chainFusion(ids){const r=chainFusionDetailed(ids);return r.made?r.id:null}

let fusionLibraryQuery='';
let fusionLibraryFilter='discovered';
let fusionLibraryPage=0;
const FUSION_LIBRARY_PAGE_SIZE=60;

function openFusionLibrary(){
  v15EnsureSave();save.fusionLibrarySeen=true;persist();
  fusionLibraryPage=0;renderFusionLibrary();showScreen('fusionLibraryScreen');
}
function setFusionLibraryFilter(filter){fusionLibraryFilter=filter;fusionLibraryPage=0;renderFusionLibrary()}
function fusionLibrarySearch(value){fusionLibraryQuery=(value||'').trim().toLocaleLowerCase('pt-BR');fusionLibraryPage=0;renderFusionLibrary()}
function fusionLibraryPrev(){if(fusionLibraryPage>0){fusionLibraryPage--;renderFusionLibrary()}}
function fusionLibraryNext(){const rows=v15FilteredRecipes();const pages=Math.max(1,Math.ceil(rows.length/FUSION_LIBRARY_PAGE_SIZE));if(fusionLibraryPage<pages-1){fusionLibraryPage++;renderFusionLibrary()}}

function v15FilteredRecipes(){
  v15EnsureRecipeIndex();
  let rows=V15_UNIQUE_RECIPES;
  if(fusionLibraryFilter==='discovered')rows=rows.filter(r=>!!save.fusionDiscoveries[r.key]);
  else if(fusionLibraryFilter==='unknown')rows=rows.filter(r=>!save.fusionDiscoveries[r.key]);
  if(fusionLibraryQuery){
    rows=rows.filter(r=>{
      const known=!!save.fusionDiscoveries[r.key];
      const A=C(r.a),B=C(r.b),R=C(r.result);
      // Unknown recipes can only be searched by already-known material card names; result stays secret.
      const hay=[A?.n,B?.n,known?R?.n:'',A?.family,B?.family,known?R?.family:''].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
      return hay.includes(fusionLibraryQuery);
    });
  }
  return rows;
}
function v15CardMini(c,hidden=false){
  if(hidden)return `<div class="fusionMini mystery"><span class="fusionMiniArt">?</span><b>???</b><small>Não descoberta</small></div>`;
  if(!c)return `<div class="fusionMini mystery"><span class="fusionMiniArt">?</span><b>---</b></div>`;
  return `<div class="fusionMini" data-rarity="${c.rarity||'N'}"><span class="fusionMiniArt">${c.art||'◆'}</span><b>${c.n}</b><small>${c.family||c.t||''}${isMonster(c)?` • ATK ${c.a}`:''}</small></div>`;
}
function renderFusionLibrary(){
  v15EnsureSave();v15EnsureRecipeIndex();
  const stats=fusionDiscoveryStats();
  const stat=document.getElementById('fusionLibraryStats');
  const bar=document.getElementById('fusionProgressFill');
  if(stat)stat.innerHTML=`<b>${stats.discovered.toLocaleString('pt-BR')}</b> / ${stats.total.toLocaleString('pt-BR')} receitas descobertas <span>(${stats.pct.toFixed(2)}%)</span>`;
  if(bar)bar.style.width=Math.min(100,stats.pct)+'%';
  document.querySelectorAll('#fusionLibraryFilters .filterBtn').forEach(b=>b.classList.toggle('active',b.dataset.ffilter===fusionLibraryFilter));
  const rows=v15FilteredRecipes(),pages=Math.max(1,Math.ceil(rows.length/FUSION_LIBRARY_PAGE_SIZE));
  fusionLibraryPage=Math.min(fusionLibraryPage,pages-1);
  const slice=rows.slice(fusionLibraryPage*FUSION_LIBRARY_PAGE_SIZE,(fusionLibraryPage+1)*FUSION_LIBRARY_PAGE_SIZE);
  const list=document.getElementById('fusionLibraryList');
  if(list)list.innerHTML=slice.length?slice.map(r=>{
    const known=!!save.fusionDiscoveries[r.key],A=C(r.a),B=C(r.b),R=C(r.result);
    return `<div class="fusionRecipe ${known?'known':'unknown'}">
      ${known?v15CardMini(A):v15CardMini(A)}<div class="fusionOperator">＋</div>${known?v15CardMini(B):v15CardMini(B)}
      <div class="fusionOperator arrow">→</div>${v15CardMini(R,!known)}
      <div class="fusionStatus">${known?'✓ DESCOBERTA':'???'}</div>
    </div>`;
  }).join(''):`<div class="fusionEmpty">Nenhuma receita corresponde a este filtro.</div>`;
  const page=document.getElementById('fusionLibraryPage');if(page)page.textContent=`Página ${fusionLibraryPage+1} / ${pages} • ${rows.length.toLocaleString('pt-BR')} resultados`;
  const prev=document.getElementById('fusionPrev');if(prev)prev.disabled=fusionLibraryPage<=0;
  const next=document.getElementById('fusionNext');if(next)next.disabled=fusionLibraryPage>=pages-1;
}

// Enhance records screen without replacing the existing stats.
const v15OpenRecordsBase=openRecords;
openRecords=function(){
  v15OpenRecordsBase();
  const s=fusionDiscoveryStats(),box=document.getElementById('recordBox');
  if(box)box.innerHTML+=`<br><b>Biblioteca de Fusões:</b> ${s.discovered.toLocaleString('pt-BR')} / ${s.total.toLocaleString('pt-BR')} (${s.pct.toFixed(2)}%)`;
};

// Show a discovery hint immediately after a newly discovered player fusion cinematic/message.
const v15PlaySelectionBase=playSelection;
playSelection=function(){
  const before=new Set(Object.keys(save.fusionDiscoveries||{}));
  v15PlaySelectionBase();
  const fresh=Object.keys(save.fusionDiscoveries||{}).filter(k=>!before.has(k));
  if(fresh.length){
    const key=fresh[fresh.length-1],last=V15_RECIPE_BY_KEY.get(key),saved=save.fusionDiscoveries?.[key];
    const resultId=last?.result||saved?.result,R=C(resultId);
    if(resultId)setTimeout(()=>msg(`NOVA FUSÃO DESCOBERTA: ${R?.n||'???'}!`,1500),1050)
  }
};

persist();
console.info('Forbidden Duel Memories v1.5/v1.7 fusion discovery library ready',{lazyIndex:true});
