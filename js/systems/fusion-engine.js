/* Forbidden Duel Memories v1.4 — Expanded Fusion Library
   Adds a deterministic Forbidden-Memories-style recipe layer on top of v1.3.
   Existing exact recipes always keep priority. */

const V14_VERSION='1.4';

// Each compatible family pair has a progression ladder. The resolver chooses
// the weakest result that is still a meaningful upgrade over the materials.
const V14_FUSION_LADDERS={
  'dragao|guerreiro':[201,210,215,417,423],
  'dragao|mago':[204,206,211,415,421],
  'dragao|passaro':[203,209,210,416,422],
  'dragao|fogo':[207,214,206,414,420],
  'aquatico|dragao':[208,214,210,418,424],
  'dragao|maquina':[212,210,206,419,425],
  'dragao|pedra':[207,214,210,414,420],
  'dragao|trevas':[206,211,214,415,421],
  'dragao|fada':[205,210,213,417,423],
  'dragao|sol':[201,210,215,417,423],
  'dragao|lua':[204,206,213,415,421],

  'guerreiro|mago':[202,204,211,411,417],
  'fada|guerreiro':[202,205,215,411,417],
  'guerreiro|maquina':[201,212,215,417,423],
  'guerreiro|passaro':[203,201,215,411,417],
  'guerreiro|pedra':[201,207,215,411,417],
  'guerreiro|trevas':[202,204,211,411,417],
  'guerreiro|sol':[201,205,215,411,417],
  'guerreiro|lua':[202,204,215,411,417],
  'aquatico|guerreiro':[202,208,215,412,418],
  'fogo|guerreiro':[201,207,215,411,417],

  'fada|mago':[204,205,213,409,415],
  'mago|trevas':[204,202,211,409,415],
  'mago|sol':[205,204,213,409,415],
  'lua|mago':[204,202,211,409,415],
  'aquatico|mago':[204,208,211,409,415],
  'fogo|mago':[204,207,211,409,415],
  'mago|maquina':[204,212,211,413,419],
  'mago|passaro':[203,204,211,410,416],
  'mago|pedra':[204,207,211,409,415],

  'fogo|passaro':[203,209,214,410,416],
  'passaro|pedra':[203,207,215,410,416],
  'maquina|passaro':[203,212,215,410,416],
  'passaro|sol':[203,209,213,410,416],
  'lua|passaro':[203,204,209,410,416],
  'aquatico|passaro':[203,208,209,410,416],

  'fogo|pedra':[207,214,215,408,414],
  'maquina|pedra':[207,212,215,413,419],
  'pedra|sol':[207,205,215,408,414],
  'lua|pedra':[207,204,215,408,414],
  'aquatico|pedra':[207,208,215,408,414],

  'aquatico|fogo':[208,207,214,412,418],
  'aquatico|maquina':[208,212,215,413,419],
  'aquatico|fada':[205,208,213,412,418],
  'aquatico|trevas':[204,208,211,412,418],
  'aquatico|sol':[205,208,213,412,418],
  'aquatico|lua':[204,208,213,412,418],

  'fada|trevas':[204,205,213,409,415],
  'fada|sol':[205,213,215,411,417],
  'fada|lua':[204,205,213,409,415],
  'fada|passaro':[203,205,213,410,416],
  'fada|pedra':[205,207,213,411,417],
  'fada|maquina':[205,212,213,413,419],
  'fada|fogo':[205,207,213,411,417],

  'maquina|trevas':[202,212,211,413,419],
  'maquina|sol':[201,212,215,413,419],
  'lua|maquina':[202,212,211,413,419],
  'fogo|maquina':[207,212,214,413,419],

  'passaro|trevas':[203,204,209,410,416],
  'passaro|sol':[203,209,213,410,416],
  'lua|passaro':[203,204,209,410,416],

  'pedra|trevas':[202,207,211,408,414],
  'pedra|sol':[201,207,215,408,414],
  'lua|pedra':[202,207,211,408,414],

  'sol|trevas':[202,205,213,411,417],
  'lua|sol':[202,205,213,411,417],
  'lua|trevas':[202,204,211,409,415],
  'fogo|trevas':[202,207,211,408,414],
  'fogo|sol':[201,207,209,408,414]
};

// Same-family evolution. This makes weaker monsters useful without letting
// two end-game monsters automatically jump to the strongest result.
const V14_SAME_FAMILY={
  dragao:[201,206,210,414,420],
  guerreiro:[202,215,411,417,423],
  mago:[204,211,409,415,421],
  passaro:[203,209,410,416,422],
  aquatico:[208,412,418,424],
  maquina:[212,413,419,425],
  fada:[205,213,411,417,423],
  fogo:[207,214,408,414,420],
  pedra:[207,215,408,414,420],
  trevas:[202,204,211,409,415],
  sol:[201,205,215,411,417],
  lua:[202,204,213,409,415]
};

function v14PairKey(A,B){return [A.family||'',B.family||''].sort().join('|')}
function v14EligibleMaterial(c){
  return !!c && isMonster(c) && !c.fusion && c.family!=='reliquias' && c.family!=='chefes';
}
function v14PickFromLadder(ladder,A,B){
  if(!ladder?.length)return null;
  const strongest=Math.max(A.a||0,B.a||0);
  // FM-style progression: seek a visible upgrade, but cap jumps for weak cards.
  const desired=strongest + (strongest<1400?250:strongest<1900?300:strongest<2300?350:400);
  const candidates=ladder.map(C).filter(c=>c&&c.fusion).sort((x,y)=>(x.a||0)-(y.a||0));
  let result=candidates.find(c=>(c.a||0)>=desired);
  if(!result) result=candidates[candidates.length-1];
  // No recipe should downgrade the strongest material.
  if(!result || (result.a||0)<=strongest)return null;
  return result.id;
}
const V14_FAMILY_AFFINITY={
  dragao:['Fogo','Raio','Luz','Trevas'], guerreiro:['Terra','Fogo','Luz','Trevas'],
  mago:['Trevas','Luz','Fogo','Água'], passaro:['Vento','Raio','Fogo','Luz'],
  aquatico:['Água','Raio'], maquina:['Raio','Terra'], fada:['Luz','Terra'],
  fogo:['Fogo','Terra'], pedra:['Terra','Luz'], trevas:['Trevas'], sol:['Luz','Terra','Vento'], lua:['Trevas','Luz']
};
function v14ThematicAffinity(A,B){
  const fa=A.family||'',fb=B.family||'';
  if(fa===fb)return true;
  // Same element is a reliable recipe clue.
  if(A.e&&B.e&&A.e===B.e)return true;
  const aa=V14_FAMILY_AFFINITY[fa]||[],bb=V14_FAMILY_AFFINITY[fb]||[];
  // Cross-family recipes require at least one material's element to resonate
  // with the other material's family. This leaves real failed combinations.
  if(aa.includes(B.e)||bb.includes(A.e))return true;
  // Classic thematic exceptions.
  const k=v14PairKey(A,B);
  if(k==='dragao|guerreiro'&&(A.a<1900||B.a<1900))return true;
  if(k==='fogo|passaro')return true;
  if(k==='aquatico|dragao'&&(A.e==='Água'||B.e==='Água'))return true;
  if(k==='guerreiro|mago'&&(A.e==='Trevas'||B.e==='Trevas'||A.e==='Luz'||B.e==='Luz'))return true;
  return false;
}
function v14ResolveRecipe(a,b){
  const A=C(a),B=C(b); if(!v14EligibleMaterial(A)||!v14EligibleMaterial(B))return null;
  const fa=A.family||'',fb=B.family||'';
  let ladder=null;
  if(fa===fb) ladder=V14_SAME_FAMILY[fa];
  else ladder=V14_FUSION_LADDERS[v14PairKey(A,B)];
  if(!ladder||!v14ThematicAffinity(A,B))return null;
  return v14PickFromLadder(ladder,A,B);
}

// v1.7: the huge generated fusion table is no longer built at boot.
// Exact hand-authored recipes stay resident; generated recipes are resolved
// on demand during a duel and fully materialized only for the Fusion Library.
const V14_GENERATED_FUSIONS=[];
const V14_FUSION_MAP=new Map();
for(const recipe of FUS){
  const key=recipe[0].slice().sort((a,b)=>a-b).join(':');
  if(!V14_FUSION_MAP.has(key))V14_FUSION_MAP.set(key,recipe[1]);
}
let V14_FULL_LIBRARY_READY=false;
function ensureFullFusionLibrary(){
  if(V14_FULL_LIBRARY_READY)return FUS;
  const existing=new Set(FUS.map(x=>x[0].slice().sort((a,b)=>a-b).join(':')));
  const materials=DB.filter(v14EligibleMaterial);
  for(let i=0;i<materials.length;i++){
    for(let j=i+1;j<materials.length;j++){
      const A=materials[i],B=materials[j],key=[A.id,B.id].sort((a,b)=>a-b).join(':');
      if(existing.has(key))continue;
      const out=v14ResolveRecipe(A.id,B.id);
      if(!out)continue;
      const recipe=[[A.id,B.id],out];
      FUS.push(recipe);V14_GENERATED_FUSIONS.push(recipe);existing.add(key);V14_FUSION_MAP.set(key,out);
    }
  }
  V14_FULL_LIBRARY_READY=true;
  return FUS;
}
function findFusion(a,b){
  const key=[a,b].sort((x,y)=>x-y).join(':');
  const exact=V14_FUSION_MAP.get(key);if(exact)return exact;
  // In a duel we only resolve the requested pair, avoiding the global 6k table.
  return v14ResolveRecipe(a,b)||null;
}
function fusionRecipesFor(id){
  ensureFullFusionLibrary();
  return FUS.filter(r=>r[0].includes(id)).map(r=>({with:r[0][0]===id?r[0][1]:r[0][0],result:r[1]}));
}

// AI now compares all 2-card fusions and a useful 3-card chain, choosing the
// largest practical gain rather than the first recipe it happens to find.
function bestAIFusion(){
  let best=null;
  const h=S.eHand;
  for(let i=0;i<h.length;i++)for(let j=i+1;j<h.length;j++){
    const r=findFusion(h[i],h[j]);if(!r)continue;
    const gain=(C(r)?.a||0)-Math.max(C(h[i])?.a||0,C(h[j])?.a||0);
    if(!best||gain>best.gain)best={idx:[i,j],r,gain};
    for(let k=j+1;k<h.length;k++){
      const r2=findFusion(r,h[k]);if(!r2)continue;
      const gain2=(C(r2)?.a||0)-Math.max(C(h[i])?.a||0,C(h[j])?.a||0,C(h[k])?.a||0);
      if(!best||gain2>best.gain)best={idx:[i,j,k],r:r2,gain:gain2};
    }
  }
  if(!best)return false;
  best.idx.slice().sort((a,b)=>b-a).forEach(i=>S.eHand.splice(i,1));
  S.eHand.push(best.r);return true;
}


if(typeof save!=='undefined'){
  save.gameVersion=V14_VERSION;
  if(typeof persist==='function')persist();
}
console.info('Forbidden Duel Memories v1.4/v1.7 fusion resolver ready',{baseRecipes:FUS.length,cards:DB.length,lazy:true});
