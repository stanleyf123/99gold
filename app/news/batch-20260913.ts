import type { Editorial, NewsLocale } from "./editorial";

const publishedAt = "2026-09-12T17:30:24Z";

type Edition = Omit<Editorial, "publishedAt">;

const pipelineSource = [{
  title: "Reuters · Saudi Arabia shuts East-West oil pipeline after drone attack",
  url: "https://www.reuters.com/business/energy/saudis-shut-down-oil-pipeline-houthis-tighten-grip-red-sea-shipping-2026-09-12/",
  date: "2026-09-12",
}];

const kocherSource = [{
  title: "Financial Times · ECB may need further rate rise if oil stays near $100, Kocher warns",
  url: "https://www.ft.com/content/a83e620a-bb72-478a-ac77-10635ec653bd",
  date: "2026-09-12",
}];

const editions: Edition[] = [
  {
    id: "saudi-pipeline-energy-gold-20260913-zh", group: "saudi-pipeline-energy-gold-20260913", locale: "zh", category: "macro",
    title: "沙烏地輸油管暫停運作：能源風險如何傳導到黃金市場",
    description: "沙烏地阿拉伯在無人機攻擊後預防性關閉東西向輸油管。本文區分已知事實與本站分析，整理油價、通膨、利率和避險需求可能如何影響黃金。",
    eventDate: "2026-09-12", image: "/news-energy-pipeline-20260913.webp",
    imageAlt: "沙漠輸油管、能源設施與金條構成的AI概念示意圖。",
    sources: pipelineSource,
    sections: [
      { heading: "新聞事實：重要輸油通道預防性關閉", source: 0, paragraphs: [
        "路透社9月12日報導，沙烏地阿拉伯在無人機攻擊後，暫時關閉連接東部油田與紅海延布港的東西向輸油管。這條管線全長約1,200公里，平時可輸送每日約400萬至500萬桶原油，相當於全球供應量約4%至5%。沙烏地方面仍在評估設施損害與出口影響，因此目前不能把名目輸送能力直接視為實際供應損失。"
      ] },
      { heading: "本站解讀：黃金面對的是三條傳導路徑", paragraphs: [
        "能源供應風險可能透過油價、通膨預期與市場避險情緒影響黃金，但方向未必一致。若能源價格持續上升，投資人可能提高對購買力與地緣風險的關注，為黃金的保值與避險敘事提供支持；然而更高的通膨預期也可能讓市場押注利率維持高檔，增加持有不生息黃金的機會成本。",
        "因此，管線關閉本身不是金價必然上漲的證明。較合理的判讀方式，是同時觀察油價漲幅能否延續、主要國家債券殖利率及美元如何反應，以及實際供應是否受到長時間限制。本文只建立事件到黃金的分析鏈條，並未把同時發生的價格波動歸因於單一消息。"
      ] },
      { heading: "接下來觀察：持續時間比標題更重要", paragraphs: [
        "第一個關鍵是管線何時恢復，以及出口是否能透過其他設施調度。第二是油價反應會否延伸至成品油與通膨預期，而不是只有盤中風險溢價。第三是央行如何描述能源衝擊：若被視為短暫供給事件，政策反應可能有限；若演變成持續性物價壓力，利率預期才可能明顯改變。",
        "台灣讀者比較本地金價時，還應分開看美元金價與新台幣匯率。國際金價、匯率、純度、重量單位、工費和銀樓買賣價差都會影響成交金額，不能用一則能源新聞替代即時且有時間戳記的報價。"
      ] },
      { heading: "文章界線", paragraphs: [
        "本文根據已標示日期的公開報導，由本站重新查核、整理與撰寫；事實與本站解讀已分段呈現。內容不構成即時報價、價格保證或買賣建議。配圖為AI生成示意圖，不是攻擊現場或實際設施照片。"
      ] },
    ],
  },
  {
    id: "saudi-pipeline-energy-gold-20260913-en", group: "saudi-pipeline-energy-gold-20260913", locale: "en", category: "macro",
    title: "Saudi pipeline shutdown: how an energy shock could reach the gold market",
    description: "Saudi Arabia temporarily shut its East-West oil pipeline as a precaution after a drone attack. We separate reported facts from analysis of the possible oil, inflation, rates and safe-haven channels to gold.",
    eventDate: "2026-09-12", image: "/news-energy-pipeline-20260913.webp",
    imageAlt: "AI concept illustration combining a desert oil pipeline, energy infrastructure and gold bars.",
    sources: pipelineSource,
    sections: [
      { heading: "The news: a major oil route was shut as a precaution", source: 0, paragraphs: [
        "Reuters reported on September 12 that Saudi Arabia temporarily shut the East-West pipeline linking eastern oil fields with the Red Sea port of Yanbu after a drone attack. The roughly 1,200-kilometre route normally carries about four to five million barrels per day, or some 4% to 5% of global supply. Saudi authorities were still assessing damage and the impact on exports, so nameplate capacity should not be treated as confirmed lost supply."
      ] },
      { heading: "Our analysis: three transmission channels to gold", paragraphs: [
        "An energy-supply risk can affect gold through oil prices, inflation expectations and demand for defensive assets, but those forces need not point in the same direction. Persistently higher energy prices may sharpen concerns about purchasing power and geopolitical risk, supporting gold’s store-of-value narrative. At the same time, firmer inflation expectations may cause investors to anticipate higher-for-longer interest rates, increasing the opportunity cost of holding non-yielding gold.",
        "The pipeline shutdown is therefore not proof that gold must rise. A more useful assessment tracks whether the oil move persists, how major sovereign yields and the dollar react, and whether physical supply remains constrained for long. This article maps the possible channels; it does not attribute every concurrent gold-price move to this single event."
      ] },
      { heading: "What to watch: duration matters more than the headline", paragraphs: [
        "The first question is when the pipeline resumes and whether exports can be redirected through other facilities. The second is whether the oil move passes into refined products and inflation expectations rather than remaining an intraday risk premium. The third is how central banks describe the shock: a temporary supply event may provoke little policy response, while persistent price pressure could alter the expected rate path.",
        "Taiwan readers should also separate the US-dollar gold price from the Taiwan-dollar exchange rate. International gold, currency conversion, purity, weight units, workmanship charges and dealer spreads all affect the transaction price. One energy headline cannot replace a timestamped live quote."
      ] },
      { heading: "Scope and disclosure", paragraphs: [
        "This article was independently checked, organised and written from dated public reporting; reported facts and our interpretation appear in separate sections. It is not a live quote, a guaranteed price call or trading advice. The image is an AI-generated illustration, not a photograph of the attack or the actual facility."
      ] },
    ],
  },
  {
    id: "saudi-pipeline-energy-gold-20260913-ja", group: "saudi-pipeline-energy-gold-20260913", locale: "ja", category: "macro",
    title: "サウジの送油管停止、エネルギーリスクは金市場へどう波及するか",
    description: "サウジアラビアはドローン攻撃後、東西送油管を予防的に停止しました。報道で確認できた事実と、原油・インフレ・金利・安全資産需要を通じた金への影響を分けて解説します。",
    eventDate: "2026-09-12", image: "/news-energy-pipeline-20260913.webp",
    imageAlt: "砂漠の送油管、エネルギー施設、金の延べ棒を組み合わせたAI概念図。",
    sources: pipelineSource,
    sections: [
      { heading: "ニュースの事実：主要な原油輸送ルートを予防的に停止", source: 0, paragraphs: [
        "ロイターは9月12日、サウジアラビアがドローン攻撃を受け、東部油田と紅海側のヤンブー港を結ぶ東西送油管を一時停止したと報じました。全長約1,200キロの同管は通常、日量約400万～500万バレル、世界供給の約4～5%を輸送できます。設備の損傷と輸出への影響はなお評価中であり、名目輸送能力の全量を実際の供給減とみなすことはできません。"
      ] },
      { heading: "当サイトの分析：金へ至る三つの経路", paragraphs: [
        "エネルギー供給リスクは、原油価格、インフレ期待、安全資産需要を通じて金に影響し得ますが、力の向きは必ずしも同じではありません。エネルギー高が続けば、購買力低下や地政学リスクへの警戒が強まり、金の価値保存機能に注目が集まる可能性があります。一方、インフレ期待の上昇が高金利の長期化観測につながれば、利息を生まない金の保有コストは相対的に高まります。",
        "したがって、送油管の停止だけで金価格の上昇が決まるわけではありません。原油の上昇が持続するか、主要国の国債利回りとドルがどう反応するか、現物供給の制約が長期化するかを併せて確認する必要があります。本稿は影響経路を整理するもので、同時に生じたすべての値動きを一つのニュースに帰属させるものではありません。"
      ] },
      { heading: "今後の焦点：見出しより停止期間", paragraphs: [
        "まず、送油管の再開時期と、他の設備で輸出を振り替えられるかが重要です。次に、原油高が一時的なリスク上乗せにとどまらず、石油製品やインフレ期待へ広がるかを見ます。さらに、中央銀行が一過性の供給ショックと評価するのか、持続的な物価圧力とみなして政策金利の見通しを変えるのかを区別する必要があります。",
        "台湾での金価格を比較する際は、ドル建て金価格と台湾ドル相場も分けて考えます。国際価格、為替、純度、重量単位、加工費、販売店のスプレッドが実際の取引額を左右します。エネルギー関連の見出し一つで、時刻表示のある現在価格を代用することはできません。"
      ] },
      { heading: "記事の範囲と画像について", paragraphs: [
        "本記事は日付の確認できる公開報道を基に、当サイトが独自に確認・整理・執筆し、事実と解釈を分けて掲載しています。リアルタイム価格、確実な相場予測、売買助言ではありません。画像はAI生成の概念図であり、攻撃現場や実際の施設の写真ではありません。"
      ] },
    ],
  },
  {
    id: "kocher-oil-ecb-gold-20260913-zh", group: "kocher-oil-ecb-gold-20260913", locale: "zh", category: "policy",
    title: "油價若守在100美元附近，ECB官員稱仍可能升息：黃金該看什麼",
    description: "奧地利央行總裁Martin Kocher表示，若油價接近100美元並持續至年底，歐洲央行可能需要再升息。這是條件式個人觀點，而非ECB既定決策。",
    eventDate: "2026-09-12", image: "/news-ecb-oil-20260913.webp",
    imageAlt: "歐洲央行意象、油桶、利率曲線與金條的AI概念示意圖。",
    sources: kocherSource,
    sections: [
      { heading: "新聞事實：一位決策官員提出條件式警告", source: 0, paragraphs: [
        "英國《金融時報》9月12日報導，奧地利央行總裁、歐洲央行管理委員會成員Martin Kocher表示，如果油價維持在每桶約100美元附近直到年底，歐洲央行可能需要進一步升息。他談的是能源價格長時間居高不下時的政策風險，不是代表管理委員會已經承諾下一次會議升息。"
      ] },
      { heading: "本站解讀：政策不確定性讓黃金同時承受兩股力量", paragraphs: [
        "對黃金而言，這類訊息同時強化通膨與利率兩個敘事。能源成本若推高物價，可能增加投資人對實質購買力的關注；但若央行以更高政策利率回應，歐元區債券殖利率上升也會提高持有無息黃金的相對成本。市場還會透過歐元兌美元重新定價，使美元金價與歐元金價的反應可能不同。",
        "Kocher的說法最重要的地方不是預測某次會議，而是指出政策路徑對油價水準與持續時間具有條件性。本站因此不把這段談話寫成『ECB確定升息』，也不把它直接等同於金價方向。實際反應仍取決於後續能源價格、通膨數據及其他委員的共識。"
      ] },
      { heading: "接下來觀察：把條件逐項核對", paragraphs: [
        "首先要看布蘭特原油是否真的在接近100美元的區域維持到年底，而非短暫觸及；其次是能源上漲有沒有擴散到核心物價、薪資與通膨預期。再者，應閱讀歐洲央行正式會議聲明、會議紀錄及多位委員談話，而不是以單一官員的條件句代表集體決策。",
        "追蹤黃金時，可同步比較實質殖利率、美元與歐元匯率以及不同幣別金價。對台灣買家而言，新台幣匯率與零售價差仍會改變最後成交成本；國際事件分析不能替代有來源、單位與時間戳記的真實報價。"
      ] },
      { heading: "文章界線", paragraphs: [
        "本文依據已標示日期的媒體報導，由本站獨立整理與撰寫，並將報導事實和本站解讀分開。本文不構成央行決策預告、即時金價或投資建議。配圖為AI生成概念示意，不是會議或人物的現場照片。"
      ] },
    ],
  },
  {
    id: "kocher-oil-ecb-gold-20260913-en", group: "kocher-oil-ecb-gold-20260913", locale: "en", category: "policy",
    title: "ECB official says $100 oil could require another hike: what gold watchers should track",
    description: "Austrian central bank governor Martin Kocher said the ECB might need another rate increase if oil remains near $100 through year-end. It is a conditional individual view, not a committed ECB decision.",
    eventDate: "2026-09-12", image: "/news-ecb-oil-20260913.webp",
    imageAlt: "AI concept illustration of the ECB, oil barrels, an interest-rate curve and gold bars.",
    sources: kocherSource,
    sections: [
      { heading: "The news: one policymaker makes a conditional warning", source: 0, paragraphs: [
        "The Financial Times reported on September 12 that Austrian central bank governor and ECB Governing Council member Martin Kocher said the European Central Bank might need to raise rates further if oil remains around $100 a barrel through the end of the year. He was describing a policy risk under a prolonged energy-price scenario, not announcing that the Governing Council has committed to a hike at its next meeting."
      ] },
      { heading: "Our analysis: gold faces two forces at once", paragraphs: [
        "For gold, the comment reinforces both an inflation narrative and an interest-rate narrative. If energy costs lift consumer prices, investors may focus more on preserving real purchasing power. But if the central bank responds with a higher policy rate, rising euro-area yields can increase the relative cost of owning non-interest-bearing gold. Repricing through the euro-dollar exchange rate may also make the response of dollar gold different from that of euro gold.",
        "The significance of Kocher’s statement is not that it predicts a particular meeting, but that the policy path is conditional on the level and duration of oil prices. We therefore do not recast it as ‘the ECB will raise rates’ or as a direct gold-price signal. The outcome depends on subsequent energy prices, inflation data and whether other policymakers share his assessment."
      ] },
      { heading: "What to watch: test each condition", paragraphs: [
        "First, observe whether Brent actually remains near $100 through year-end rather than touching that level briefly. Second, check whether energy inflation spreads into core prices, wages and inflation expectations. Third, use formal ECB statements, meeting accounts and the views of multiple Council members to judge collective policy rather than treating one official’s conditional sentence as a decision.",
        "Gold readers can compare real yields, the dollar-euro exchange rate and gold prices in different currencies. For Taiwan buyers, the Taiwan-dollar exchange rate and retail spread still change the final transaction cost. International policy analysis cannot replace a genuine quote with a source, unit and timestamp."
      ] },
      { heading: "Scope and disclosure", paragraphs: [
        "This independently written article is based on dated media reporting and separates reported facts from our analysis. It is not advance notice of an ECB decision, a live gold price or investment advice. The image is an AI-generated concept illustration, not a photograph of a meeting or policymaker."
      ] },
    ],
  },
  {
    id: "kocher-oil-ecb-gold-20260913-ja", group: "kocher-oil-ecb-gold-20260913", locale: "ja", category: "policy",
    title: "原油100ドルが続けばECB追加利上げも、金市場が確認すべき点",
    description: "オーストリア中銀のMartin Kocher総裁は、原油が年末まで100ドル前後で推移すればECBは追加利上げを迫られる可能性があると述べました。これは条件付きの個人見解で、決定済みの政策ではありません。",
    eventDate: "2026-09-12", image: "/news-ecb-oil-20260913.webp",
    imageAlt: "ECBを想起させる建物、原油樽、金利曲線、金の延べ棒を組み合わせたAI概念図。",
    sources: kocherSource,
    sections: [
      { heading: "ニュースの事実：政策委員一人による条件付きの警告", source: 0, paragraphs: [
        "英紙フィナンシャル・タイムズは9月12日、オーストリア中銀総裁でECB理事会メンバーのMartin Kocher氏が、原油価格が年末まで1バレル100ドル前後にとどまれば、欧州中央銀行は追加利上げを迫られる可能性があると述べたと報じました。これはエネルギー高が長期化する場合の政策リスクであり、理事会が次回会合での利上げを決めたという発表ではありません。"
      ] },
      { heading: "当サイトの分析：金には二つの力が同時に働く", paragraphs: [
        "金にとって、この発言はインフレと金利という二つの材料を同時に強めます。エネルギーコストが物価を押し上げれば、実質的な購買力の維持に注目が集まる可能性があります。一方、中央銀行がより高い政策金利で対応し、ユーロ圏の利回りが上昇すれば、利息を生まない金の相対的な保有コストは高まります。ユーロ・ドル相場を通じた再評価により、ドル建て金とユーロ建て金の反応が異なることもあります。",
        "Kocher氏の発言の要点は特定の会合を予測したことではなく、政策経路が原油価格の水準と継続期間に左右されると示した点です。当サイトはこれを「ECBが利上げを決定」とは表現せず、金価格の方向とも直結させません。実際の判断は今後のエネルギー価格、物価統計、他の理事の見解に依存します。"
      ] },
      { heading: "今後の確認点：条件を一つずつ検証する", paragraphs: [
        "まず、ブレント原油が一時的に100ドルへ達するだけでなく、年末までその近辺にとどまるかを確認します。次に、エネルギー高がコア物価、賃金、インフレ期待へ波及するかを見ます。さらに、一人の委員の条件付き発言を集団決定とみなさず、ECBの正式声明、議事要旨、複数の理事の発言を照合する必要があります。",
        "金を追う際は、実質利回り、ドル・ユーロ相場、通貨別の金価格を併せて比較できます。台湾の購入者にとっては台湾ドル相場と小売スプレッドも最終コストを変えます。国際政策の分析は、出典・単位・時刻のある実際の価格表示の代わりにはなりません。"
      ] },
      { heading: "記事の範囲と画像について", paragraphs: [
        "本記事は日付の確認できる報道を基に独自に整理・執筆し、報道された事実と当サイトの分析を分けています。ECBの決定予告、リアルタイムの金価格、投資助言ではありません。画像はAI生成の概念図であり、会合や人物の現場写真ではありません。"
      ] },
    ],
  },
];

export const batchSeptember13: Editorial[] = editions.map((edition) => ({ ...edition, publishedAt }));

export const batchSeptember13Locales: NewsLocale[] = ["zh", "en", "ja"];
