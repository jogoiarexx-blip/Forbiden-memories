/* Registro global de cartas — compatível com file:// */
var CARD_DB = [];
function registerCards(cards){
  for (const card of cards){
    if (CARD_DB.some(c=>c.id===card.id)) {
      console.warn("ID de carta duplicado ignorado:", card.id, card.n);
      continue;
    }
    CARD_DB.push(Object.freeze({kind:"monster", rarity:"N", ...card}));
  }
}
