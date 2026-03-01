import { AdhkarSetDoc } from "./adhkarTypes";

export const ADHKAR_SEED_DOCS: AdhkarSetDoc[] = [
  {
    "_id": "adhkar_morning",
    "type": "morning",
    "title_ar": "أذكار الصباح",
    "items": [
      { "id": "m_001", "key": "ayat_al_kursi", "text_ar": "آية الكرسي", "repeat": 1, "priority": 1, "content_type": "quran", "quran": { "surah": 2, "mode": "single", "ayah": 255 } },
      { "id": "m_002", "key": "surah_al_ikhlas", "text_ar": "سورة الإخلاص", "repeat": 3, "priority": 1, "content_type": "quran", "quran": { "surah": 112, "mode": "full" } },
      { "id": "m_003", "key": "surah_al_falaq", "text_ar": "سورة الفلق", "repeat": 3, "priority": 1, "content_type": "quran", "quran": { "surah": 113, "mode": "full" } },
      { "id": "m_004", "key": "surah_an_nas", "text_ar": "سورة الناس", "repeat": 3, "priority": 1, "content_type": "quran", "quran": { "surah": 114, "mode": "full" } },
      { "id": "m_005", "key": "asbahna_wa_asbaha_al_mulk", "text_ar": "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. ربِّ أسألك خير ما في هذا اليوم وخير ما بعده، وأعوذ بك من شر ما في هذا اليوم وشر ما بعده. ربِّ أعوذ بك من الكسل وسوء الكِبَر. ربِّ أعوذ بك من عذابٍ في النار وعذابٍ في القبر.", "repeat": 1, "priority": 3 },
      { "id": "m_006", "key": "allahumma_bika_asbahna", "text_ar": "اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.", "repeat": 1, "priority": 2 },
      { "id": "m_007", "key": "allahumma_inni_asbahtu_ushhiduka", "text_ar": "اللهم إني أصبحتُ أُشهدك، وأُشهد حملة عرشك، وملائكتك، وجميع خلقك، أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمدًا عبدك ورسولك.", "repeat": 4, "priority": 3 },
      { "id": "m_008", "key": "allahumma_ma_asbaha_bi_min_niamah", "text_ar": "اللهم ما أصبح بي من نعمةٍ أو بأحدٍ من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.", "repeat": 1, "priority": 2 },
      { "id": "m_009", "key": "raditu_billahi_rabban", "text_ar": "رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.", "repeat": 3, "priority": 1 },
      { "id": "m_010", "key": "hasbiyallahu_la_ilaha_illa_huwa", "text_ar": "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.", "repeat": 7, "priority": 2 },
      { "id": "m_011", "key": "bismillah_alladhi_la_yadurr", "text_ar": "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.", "repeat": 3, "priority": 2 },
      { "id": "m_012", "key": "allahumma_inni_asaluka_al_afwa_wal_afiyah", "text_ar": "اللهم إني أسألك العفو والعافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي وآمن روعاتي، واحفظني من بين يدي ومن خلفي وعن يميني وعن شمالي ومن فوقي، وأعوذ بعظمتك أن أُغتال من تحتي.", "repeat": 1, "priority": 3 },
      { "id": "m_013", "key": "ya_hayyu_ya_qayyum", "text_ar": "يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.", "repeat": 1, "priority": 2 },
      { "id": "m_014", "key": "aoodhu_bikalimatillah_at_tammat", "text_ar": "أعوذ بكلمات الله التامات من شر ما خلق.", "repeat": 3, "priority": 2 },
      { "id": "m_015", "key": "allahumma_aafini_fi_badani", "text_ar": "اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت.", "repeat": 3, "priority": 2 },
      { "id": "m_016", "key": "subhanallahi_wa_bihamdih", "text_ar": "سبحان الله وبحمده.", "repeat": 100, "priority": 1 },
      { "id": "m_017", "key": "la_ilaha_illallah_wahdahu", "text_ar": "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", "repeat": 100, "priority": 1 }
    ],
    "metadata": { "version": 1, "language": "ar", "createdAt": "2026-02-28T00:00:00.000Z", "updatedAt": "2026-02-28T00:00:00.000Z" }
  },
  {
    "_id": "adhkar_evening",
    "type": "evening",
    "title_ar": "أذكار المساء",
    "items": [
      { "id": "e_001", "key": "ayat_al_kursi", "text_ar": "آية الكرسي (البقرة: 255)", "repeat": 1, "priority": 1, "content_type": "quran", "quran": { "surah": 2, "mode": "single", "ayah": 255 } },
      { "id": "e_002", "key": "surah_al_ikhlas", "text_ar": "سورة الإخلاص", "repeat": 3, "priority": 1, "content_type": "quran", "quran": { "surah": 112, "mode": "full" } },
      { "id": "e_003", "key": "surah_al_falaq", "text_ar": "سورة الفلق", "repeat": 3, "priority": 1, "content_type": "quran", "quran": { "surah": 113, "mode": "full" } },
      { "id": "e_004", "key": "surah_an_nas", "text_ar": "سورة الناس", "repeat": 3, "priority": 1, "content_type": "quran", "quran": { "surah": 114, "mode": "full" } },
      { "id": "e_005", "key": "amsayna_wa_amsa_al_mulk", "text_ar": "أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. ربِّ أسألك خير ما في هذه الليلة وخير ما بعدها، وأعوذ بك من شر ما في هذه الليلة وشر ما بعدها. ربِّ أعوذ بك من الكسل وسوء الكِبَر. ربِّ أعوذ بك من عذابٍ في النار وعذابٍ في القبر.", "repeat": 1, "priority": 3 },
      { "id": "e_006", "key": "allahumma_bika_amsayna", "text_ar": "اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.", "repeat": 1, "priority": 2 },
      { "id": "e_007", "key": "allahumma_inni_amsaytu_ushhiduka", "text_ar": "اللهم إني أمسيتُ أُشهدك، وأُشهد حملة عرشك، وملائكتك، وجميع خلقك، أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمدًا عبدك ورسولك.", "repeat": 4, "priority": 3 },
      { "id": "e_008", "key": "allahumma_ma_amsa_bi_min_niamah", "text_ar": "اللهم ما أمسى بي من نعمةٍ أو بأحدٍ من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.", "repeat": 1, "priority": 2 },
      { "id": "e_009", "key": "raditu_billahi_rabban", "text_ar": "رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.", "repeat": 3, "priority": 1 },
      { "id": "e_010", "key": "hasbiyallahu_la_ilaha_illa_huwa", "text_ar": "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.", "repeat": 7, "priority": 2 },
      { "id": "e_011", "key": "bismillah_alladhi_la_yadurr", "text_ar": "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.", "repeat": 3, "priority": 2 },
      { "id": "e_012", "key": "allahumma_inni_asaluka_al_afwa_wal_afiyah", "text_ar": "اللهم إني أسألك العفو والعافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي وآمن روعاتي، واحفظني من بين يدي ومن خلفي وعن يميني وعن شمالي ومن فوقي، وأعوذ بعظمتك أن أُغتال من تحتي.", "repeat": 1, "priority": 3 },
      { "id": "e_013", "key": "ya_hayyu_ya_qayyum", "text_ar": "يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.", "repeat": 1, "priority": 2 },
      { "id": "e_014", "key": "aoodhu_bikalimatillah_at_tammat", "text_ar": "أعوذ بكلمات الله التامات من شر ما خلق.", "repeat": 3, "priority": 2 },
      { "id": "e_015", "key": "allahumma_aafini_fi_badani", "text_ar": "اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت.", "repeat": 3, "priority": 2 },
      { "id": "e_016", "key": "subhanallahi_wa_bihamdih", "text_ar": "سبحان الله وبحمده.", "repeat": 100, "priority": 1 },
      { "id": "e_017", "key": "la_ilaha_illallah_wahdahu", "text_ar": "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", "repeat": 100, "priority": 1 }
    ],
    "metadata": { "version": 1, "language": "ar", "createdAt": "2026-02-28T00:00:00.000Z", "updatedAt": "2026-02-28T00:00:00.000Z" }
  }
];
