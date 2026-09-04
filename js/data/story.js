const STORY={
  "prologue": [
    {
      "speaker": "Narrador",
      "portrait": "📜",
      "text": "Há séculos, seis selos mantêm adormecido o poder das Memórias Proibidas. Quando o primeiro selo se rompe, antigos duelistas voltam a caminhar entre os vivos."
    },
    {
      "speaker": "Mestre Amon",
      "portrait": "🧙‍♂️",
      "text": "Você foi escolhido pelo Baralho do Sol. Atravesse as seis regiões, derrote seus guardiões e reúna os fragmentos antes que o Faraó Esquecido desperte por completo."
    },
    {
      "speaker": "Você",
      "portrait": "🧑",
      "text": "Então os duelos não são apenas um torneio... cada vitória abre o caminho até o templo."
    }
  ],
  "region_0": [
    {
      "speaker": "Mestre Amon",
      "portrait": "🧙‍♂️",
      "text": "A Aldeia do Sol guarda o primeiro fragmento. Os duelistas daqui testam força e disciplina."
    }
  ],
  "region_1": [
    {
      "speaker": "Sacerdotisa Lunar",
      "portrait": "🌙",
      "text": "A luz não existe sem sombra. Se quer o segundo fragmento, prove que sabe lutar quando não enxerga todo o campo."
    }
  ],
  "region_2": [
    {
      "speaker": "General do Trovão",
      "portrait": "⚡",
      "text": "Nas montanhas, só permanece de pé quem domina o vento e o raio. O terceiro selo está acima das nuvens."
    }
  ],
  "region_3": [
    {
      "speaker": "Imperador do Oceano",
      "portrait": "🌊",
      "text": "O quarto fragmento afundou com uma cidade inteira. Vença o oceano antes que o oceano vença você."
    }
  ],
  "region_4": [
    {
      "speaker": "Sacerdote das Sombras",
      "portrait": "🧙",
      "text": "Você reuniu fragmentos demais. A Cripta Proibida não permitirá que saia com todos eles."
    }
  ],
  "region_5": [
    {
      "speaker": "Arauto do Faraó",
      "portrait": "🔯",
      "text": "Os cinco selos quebrou. O sexto jamais será seu. O Faraó já se recorda do próprio nome."
    }
  ],
  "boss_2": [
    {
      "speaker": "Guardião Solar",
      "portrait": "☀️",
      "text": "Você carrega o Baralho do Sol. Mostre que é digno do primeiro fragmento."
    }
  ],
  "boss_5": [
    {
      "speaker": "Cavaleiro da Lua",
      "portrait": "🛡️",
      "text": "A lua revela aquilo que o sol esconde. Seu segundo fragmento será conquistado no escuro."
    }
  ],
  "boss_8": [
    {
      "speaker": "General do Trovão",
      "portrait": "⚡",
      "text": "Chegou ao pico. Agora sobreviva à tempestade."
    }
  ],
  "boss_11": [
    {
      "speaker": "Leviatã Guardião",
      "portrait": "🐋",
      "text": "O oceano dormia até você trazer os fragmentos. Seu duelo será ouvido no fundo do mar."
    }
  ],
  "boss_14": [
    {
      "speaker": "Sacerdote das Sombras",
      "portrait": "🧙",
      "text": "Entregue os fragmentos e eu pouparei sua memória. Recuse... e esquecerá até por que veio."
    }
  ],
  "boss_17": [
    {
      "speaker": "Faraó Esquecido",
      "portrait": "👑",
      "text": "Finalmente. Cada duelo seu reconstruiu meu passado. Agora entregue o último fragmento — ou seja apagado junto com esta era."
    },
    {
      "speaker": "Você",
      "portrait": "🧑",
      "text": "Eu não atravessei seis regiões para entregar tudo agora. Este é o último duelo."
    }
  ],
  "ending": [
    {
      "speaker": "Narrador",
      "portrait": "📜",
      "text": "Com a queda do Faraó, os seis fragmentos se unem e tornam-se um único selo. As Memórias Proibidas voltam ao silêncio."
    },
    {
      "speaker": "Mestre Amon",
      "portrait": "🧙‍♂️",
      "text": "Você venceu não por possuir as cartas mais fortes, mas por aprender o que cada duelo queria ensinar."
    },
    {
      "speaker": "Narrador",
      "portrait": "🌅",
      "text": "O templo desaparece com o amanhecer. Mas, entre as cartas do seu deck, uma nova inscrição surge: 'Toda memória pode despertar novamente'."
    }
  ],
  "choice_0": [
    {
      "speaker": "Mestre Amon",
      "portrait": "🧙‍♂️",
      "text": "Dois caminhos levam à Aldeia do Sol. Pela estrada antiga, encontrará duelistas; pelo desfiladeiro, talvez encontre algo que não deveria existir.",
      "choices": [
        {
          "text": "Seguir pela estrada antiga",
          "flag": "path_safe",
          "value": true
        },
        {
          "text": "Entrar no desfiladeiro",
          "flag": "path_secret",
          "value": true
        }
      ]
    }
  ],
  "secret_canyon": [
    {
      "speaker": "???",
      "portrait": "🦂",
      "text": "Uma figura encapuzada surge entre as pedras. Ela não aparece no mapa e carrega uma carta marcada com o símbolo de uma estrela negra."
    },
    {
      "speaker": "Duelista Errante",
      "portrait": "🦂",
      "text": "Se quer atravessar este caminho, vença um duelo que nunca será registrado pelos sacerdotes."
    }
  ],
  "choice_3": [
    {
      "speaker": "Imperador do Oceano",
      "portrait": "🌊",
      "text": "Antes do duelo, ele oferece uma escolha: destruir o selo submarino agora ou preservá-lo para descobrir o que existe abaixo.",
      "choices": [
        {
          "text": "Destruir o selo",
          "flag": "ocean_destroy",
          "value": true
        },
        {
          "text": "Preservar o selo",
          "flag": "ocean_preserve",
          "value": true
        }
      ]
    }
  ],
  "secret_ocean": [
    {
      "speaker": "Narrador",
      "portrait": "🐚",
      "text": "Ao preservar o selo, uma passagem submersa se abre. Dentro dela existe um altar com uma carta que reage aos seus fragmentos."
    }
  ],
  "ngplus_intro": [
    {
      "speaker": "Narrador",
      "portrait": "♾️",
      "text": "O selo foi restaurado... mas as cartas lembram. O tempo retorna ao início, e duelistas mais fortes ocupam os mesmos caminhos."
    },
    {
      "speaker": "Mestre Amon",
      "portrait": "🧙‍♂️",
      "text": "Você manteve sua coleção. Desta vez, os chefes conhecem suas antigas estratégias. Bem-vindo ao New Game+."
    }
  ]
};
