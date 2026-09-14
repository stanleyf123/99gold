import type { Editorial } from "./editorial";

const common = {
  group: "global-central-bank-week-20260913",
  publishedAt: "2026-09-13T11:27:00Z",
  eventDate: "2026-09-13",
  category: "policy" as const,
  image: "/news-central-bank-week-20260913.webp",
  sources: [
    { title: "Financial Times · Will the Fed defy Trump and raise rates?", url: "https://www.ft.com/content/1fd5bbf6-9bb6-4848-a01b-7c94b3e59b6e", date: "2026-09-13" },
    { title: "Federal Reserve · FOMC calendars", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", date: "2026-09-13" },
    { title: "Bank of England · Monetary policy and Bank Rate", url: "https://www.bankofengland.co.uk/", date: "2026-09-13" },
  ],
};

export const batchPolicySeptember13: Editorial[] = [
  {
    ...common, id: common.group + "-zh", locale: "zh",
    title: "全球央行決策週登場：Fed、日銀與英銀預期如何牽動黃金",
    description: "Fed、日銀與英格蘭銀行本週將成為市場焦點。本文整理9月13日可觀察到的利率預期，並說明實質利率、美元與匯率如何共同影響黃金。",
    imageAlt: "三座抽象央行建築、債券曲線與金條構成的AI概念示意圖。",
    sections: [
      { heading: "新聞事實：市場同時等待三家央行", source: 0, paragraphs: [
        "英國《金融時報》9月13日報導，利率市場在本週決策前，對美國聯準會升息的定價約為85%；對日本銀行升息0.25個百分點的定價約為75%。報導同時指出，市場普遍預期英格蘭銀行維持3.75%的銀行利率，但可能調低年度量化緊縮規模。這些百分比是報導當時的市場機率與預期，不是三家央行已作成的決定。",
        "聯準會官方行事曆列有本週的政策會議；英格蘭銀行官網則標示下一次利率決定預定於9月17日公布。會議日期、交易員定價與最後決策是三件不同的事，任何新資料或政策溝通都可能讓預期在正式公告前改變。"
      ] },
      { heading: "本站解讀：黃金要看利率，也要看貨幣怎麼走", paragraphs: [
        "黃金本身不支付利息，因此市場通常會比較持有黃金與持有可生息資產的相對成本。若名目利率上升、通膨預期沒有同步上升，實質利率可能走高，對黃金形成壓力；但若央行升息被解讀為對能源通膨或金融不確定性的回應，避險需求與購買力疑慮又可能提供另一股支撐。",
        "多家央行在同一週決策，還會透過匯率產生第二層影響。Fed、日銀與英銀的政策落差可能改變美元、日圓和英鎊的相對強弱，使同一盎司黃金用不同貨幣衡量時呈現不同報酬。本站因此不把『升息』直接翻譯成單一金價方向。"
      ] },
      { heading: "接下來怎麼看：先比對決策，再看市場反應", paragraphs: [
        "第一步是以各央行正式聲明核對利率變化，而不是只看會前機率。第二步要讀政策指引：一次調整與未來利率路徑的訊號，對債券殖利率的影響可能不同。第三步同步觀察實質殖利率、美元指數與主要匯率，分辨金價變化究竟來自利率、貨幣換算或風險偏好。",
        "台灣讀者還應將國際美元金價與新台幣成交成本分開。即使國際金價不變，新台幣匯率、重量單位、純度、工費與銀樓買賣價差也可能使本地價格改變；文章中的政策機率不能替代有來源、時間戳記與單位的即時報價。"
      ] },
      { heading: "文章界線", paragraphs: [
        "本文依據9月13日發布的媒體報導及央行公開資訊，由本站獨立查核、整理與撰寫，並將報導事實與本站分析分開。本文不是央行決策預告、即時交易訊號或投資建議。配圖為AI生成概念示意，不是央行會議或人物的現場照片。"
      ] },
    ],
  },
  {
    ...common, id: common.group + "-en", locale: "en",
    title: "A global central-bank week: how Fed, BoJ and BoE expectations could affect gold",
    description: "The Fed, Bank of Japan and Bank of England are in focus this week. We review expectations reported on September 13 and explain how real yields, the dollar and currency translation can jointly affect gold.",
    imageAlt: "AI concept illustration of three abstract central-bank buildings, bond curves and a gold bar.",
    sections: [
      { heading: "The news: markets await three central banks", source: 0, paragraphs: [
        "The Financial Times reported on September 13 that interest-rate markets, ahead of this week’s decisions, assigned about an 85% probability to a Federal Reserve increase and roughly a 75% probability to a 0.25-percentage-point Bank of Japan increase. It also said markets broadly expected the Bank of England to keep Bank Rate at 3.75%, while potentially reducing the annual pace of quantitative tightening. These figures are market pricing and expectations at the time of the report, not decisions already made by the three central banks.",
        "The Federal Reserve’s official calendar lists this week’s policy meeting, while the Bank of England website identifies September 17 as the next due date for its rate decision. A meeting date, trader pricing and the final decision are different things. New data or policy communication can change expectations before an announcement."
      ] },
      { heading: "Our analysis: gold depends on rates and currencies", paragraphs: [
        "Gold pays no interest, so markets often compare it with the return available on yielding assets. If nominal rates rise without an equal increase in inflation expectations, real yields may climb and weigh on gold. Yet if tighter policy is interpreted as a response to energy inflation or financial uncertainty, concern about purchasing power and demand for defensive assets may provide an opposing force.",
        "Several central-bank decisions in one week also create a second channel through exchange rates. Differences among Fed, BoJ and BoE policy may alter the relative values of the dollar, yen and pound, producing different gold returns when the same ounce is measured in each currency. We therefore do not translate the word ‘hike’ into a single automatic direction for gold."
      ] },
      { heading: "What to watch: compare decisions, then reactions", paragraphs: [
        "First, verify rate changes against each central bank’s formal statement rather than relying only on pre-meeting probabilities. Second, read the guidance: a one-off move and a signal about the future path can have different effects on bond yields. Third, monitor real yields, the dollar index and major exchange rates together to distinguish a rate effect from currency translation or a change in risk appetite.",
        "Taiwan readers should also separate the international dollar gold price from the cost of a Taiwan-dollar transaction. Even if international gold is unchanged, the exchange rate, weight unit, purity, workmanship charges and dealer spread can change the local price. Policy probabilities cannot replace a live quote with a source, unit and timestamp."
      ] },
      { heading: "Scope and disclosure", paragraphs: [
        "This article was independently checked, organised and written from media reporting published on September 13 and public central-bank information. Reported facts and our analysis appear separately. It is not advance notice of a central-bank decision, a live trading signal or investment advice. The image is an AI-generated concept illustration, not a photograph of a meeting or policymaker."
      ] },
    ],
  },
  {
    ...common, id: common.group + "-ja", locale: "ja",
    title: "世界の中銀決定が集中、FRB・日銀・英中銀の予想は金にどう影響するか",
    description: "今週はFRB、日本銀行、イングランド銀行に注目が集まります。9月13日時点の金利予想を整理し、実質金利、ドル、為替換算が金に及ぼす影響を解説します。",
    imageAlt: "三つの抽象的な中央銀行建物、債券曲線、金の延べ棒を組み合わせたAI概念図。",
    sections: [
      { heading: "ニュースの事実：市場は三つの中央銀行を待つ", source: 0, paragraphs: [
        "フィナンシャル・タイムズは9月13日、今週の政策決定を前に、金利市場が米連邦準備制度の利上げを約85%、日本銀行による0.25ポイントの利上げを約75%織り込んでいると報じました。また、イングランド銀行は政策金利を3.75%に据え置くとの見方が広い一方、年間の量的引き締め規模を縮小する可能性があるとしています。これらは報道時点の市場確率と予想であり、三中銀がすでに決定した内容ではありません。",
        "連邦準備制度の公式日程には今週の政策会合が掲載され、イングランド銀行のウェブサイトは次回の金利決定を9月17日と示しています。会合日、取引市場の織り込み、最終決定はそれぞれ別のものです。新しい統計や政策発信によって、発表前に予想が変わる可能性があります。"
      ] },
      { heading: "当サイトの分析：金は金利と通貨の両方を見る", paragraphs: [
        "金は利息を生まないため、市場は金と利回りを得られる資産の相対的な保有コストを比較します。インフレ期待が同じまま名目金利が上がれば、実質金利が上昇して金の重荷になり得ます。一方、利上げがエネルギーインフレや金融不安への対応と受け止められれば、購買力への懸念や安全資産需要が逆方向の力として働く可能性があります。",
        "複数の中央銀行が同じ週に決定する場合、為替を通じた第二の経路も生じます。FRB、日銀、英中銀の政策差はドル、円、ポンドの相対価値を変え、同じ1オンスの金でも通貨別の収益率が異なり得ます。そのため当サイトは「利上げ」という言葉を、金価格の一方向のシグナルとはみなしません。"
      ] },
      { heading: "今後の確認点：決定と反応を分けて見る", paragraphs: [
        "第一に、会合前の確率だけでなく、各中銀の正式声明で金利変更を確認します。第二に政策指針を読みます。一度限りの調整と将来の金利経路に関するシグナルでは、債券利回りへの影響が異なる場合があります。第三に実質利回り、ドル指数、主要為替を同時に見て、金価格の変化が金利、通貨換算、リスク選好のどれに由来するかを分けます。",
        "台湾の読者は、国際的なドル建て金価格と台湾ドルでの取引コストも分けて考える必要があります。国際価格が変わらなくても、為替、重量単位、純度、加工費、販売店のスプレッドで現地価格は変わります。政策確率は、出典、単位、時刻のある現在価格の代わりにはなりません。"
      ] },
      { heading: "記事の範囲と画像について", paragraphs: [
        "本記事は9月13日発表の報道と中央銀行の公開情報を基に、当サイトが独自に確認・整理・執筆し、報道された事実と分析を分けています。中央銀行決定の事前通知、リアルタイムの取引シグナル、投資助言ではありません。画像はAI生成の概念図であり、会合や政策担当者の写真ではありません。"
      ] },
    ],
  },
];
