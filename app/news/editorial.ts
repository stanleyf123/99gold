import { batchSeptember12 } from "./batch-20260912";
import type { NewsCategory } from "./categories";
export type NewsLocale = "zh" | "en" | "ja";
export type Editorial = {
  id: string; group: string; locale: NewsLocale; title: string; description: string;
  publishedAt: string; eventDate: string; image: string; imageAlt: string; category?: NewsCategory;
  sections: { heading: string; paragraphs: string[]; source?: number }[];
  sources: { title: string; url: string; date: string }[];
};

// Authored edition, not scraped filler. Publication time stays fixed across visits.
// The three editions are complete translations of the same independently written analysis.
const common = {
  group: "gold-inflation-20260912",
  publishedAt: "2026-09-12T08:13:44Z",
  eventDate: "2026-09-11",
  image: "/gold-inflation-editorial-20260912.png",
  sources: [{ title: "U.S. Bureau of Labor Statistics · August 2026 CPI", url: "https://www.bls.gov/news.release/archives/cpi_09112026.htm", date: "2026-09-11" }],
};
export const editorials: Editorial[] = [
  ...batchSeptember12,
  {
    ...common, id: common.group + "-zh", locale: "zh",
    title: "通膨月增回升，黃金為何不能只看避險？",
    description: "從9月11日公布的美國8月CPI出發，拆解通膨、利率與美元如何交互影響黃金，並說明台灣讀者比較金價時應留意的差異。",
    imageAlt: "金條與透明稜鏡的AI概念示意圖，象徵黃金面對多重市場因素。",
    sections: [
      { heading: "新聞事實：最新通膨數據呈現兩種速度", source: 0, paragraphs: [
        "美國勞工統計局9月11日公布，8月消費者物價指數（CPI）季調後月增0.4%，高於7月的0.1%；年增率為3.4%。扣除食品與能源的核心CPI月增0.3%、年增2.4%。這些是8月的物價統計，不是今日金價，也不能直接代表下一次利率決策。"
      ] },
      { heading: "本站解讀：通膨不是金價的單向開關", paragraphs: [
        "對黃金而言，物價上升有兩條可能方向相反的影響路徑。一方面，購買力疑慮可能讓投資人關注黃金的保值角色；另一方面，若市場因此預期利率維持較高水準，持有不付利息資產的機會成本也可能提高。只用『通膨升、黃金就會漲』來下結論，會漏掉後面這條路徑。",
        "這裡的關鍵不是替下一根K線猜方向，而是分辨消息究竟改變了什麼：是物價的短期波動、對未來通膨的看法，還是對貨幣政策的預期？同一份數據可能同時牽動這些因素，結果不一定一致。以上是理解市場的分析框架，不是對本次行情成因的實證判定。"
      ] },
      { heading: "接下來怎麼看：把三個問題分開", paragraphs: [
        "第一，觀察後續數據能否支持持續性，而不是把單月變化直接延伸成長期趨勢。第二，分辨利率與美元的反應是否同向；美元計價的金價與其他幣別買家的感受可能不同。第三，核對你看到的是現貨、哪一個月份的期貨，或店家買賣牌告，並使用相同時間點比較。",
        "台灣讀者還要多看一層匯率與交易成本。國際金價不等於銀樓成交價；重量單位、純度、工費與買賣價差都會影響最後金額。若資料沒有來源時間，或把期貨價格標成現貨，就不適合拿來判斷現在是否買貴。"
      ] },
      { heading: "本文的界線", paragraphs: [
        "本文以已公布的官方數據為起點，由本站重新整理撰寫；沒有宣稱掌握即時交易訊號，也不提供保證漲跌或買賣指令。事件日期、本文發布日期與行情報價時間是不同概念。配圖為AI生成的概念示意，不是新聞現場照片。"
      ] },
    ],
  },
  {
    ...common, id: common.group + "-en", locale: "en",
    title: "Monthly inflation picked up. Why gold is more than a safe-haven story",
    description: "An original analysis of the August US CPI release published on September 11: inflation, interest rates, the dollar and the pitfalls of comparing different gold prices.",
    imageAlt: "AI concept illustration of gold bars and a glass prism, representing the different forces affecting gold.",
    sections: [
      { heading: "The news: two different inflation readings", source: 0, paragraphs: [
        "On September 11, the US Bureau of Labor Statistics reported August CPI growth of 0.4% month on month, seasonally adjusted, versus 0.1% in July, and 3.4% year on year. Core CPI rose 0.3% monthly and 2.4% annually. These are August inflation statistics, not a current gold quote or a determination of the next interest-rate decision."
      ] },
      { heading: "Our analysis: inflation is not a one-way switch for gold", paragraphs: [
        "Rising prices can affect gold through two potentially opposing channels. Concern about purchasing power may draw attention to its store-of-value role. Yet if investors expect interest rates to remain higher as a result, the opportunity cost of holding a non-interest-bearing asset may also rise. The shortcut ‘higher inflation means higher gold’ leaves out that second channel.",
        "The useful question is not how to predict the next candlestick, but what the news changes: short-term price fluctuations, expectations of future inflation, or the anticipated path of monetary policy. One release can affect all three without pointing them in the same direction. This is a framework for interpreting markets, not an empirical finding about what caused this particular price move."
      ] },
      { heading: "What to watch: separate three questions", paragraphs: [
        "First, consider whether subsequent releases support persistence rather than extending a single monthly change into a long-term trend. Second, distinguish the responses of interest rates and the dollar: a dollar gold price and the experience of buyers using another currency may differ. Third, identify whether a displayed price is spot, a particular futures contract, or a dealer quote, and compare observations from the same time.",
        "Readers in Taiwan also need to account for exchange rates and transaction costs. An international quote is not a jewelry-store transaction price. Weight units, purity, workmanship charges and the bid–ask spread affect the final amount. Data without a source timestamp, or futures mislabeled as spot, cannot provide a sound comparison of what a purchase costs now."
      ] },
      { heading: "Scope of this article", paragraphs: [
        "This independently written article starts with published official statistics. It does not claim to provide live trading signals, guaranteed price outcomes or instructions to buy or sell. The event date, this article’s publication date and a market quote’s timestamp are different concepts. The accompanying image is an AI-generated concept illustration, not a photograph of a news event."
      ] },
    ],
  },
  {
    ...common, id: common.group + "-ja", locale: "ja",
    title: "インフレの前月比が加速、金は「安全資産」だけでは読めない",
    description: "9月11日発表の米国8月CPIを基に、インフレ・金利・ドルが金に及ぼす影響と、異なる金価格を比較する際の注意点を独自に解説します。",
    imageAlt: "金価格に影響する複数の要因を表現した、金の延べ棒と透明なプリズムのAI概念図。",
    sections: [
      { heading: "ニュースの事実：異なる二つの物価指標", source: 0, paragraphs: [
        "米労働統計局は9月11日、8月の消費者物価指数（CPI）が季節調整済み前月比で0.4%上昇し、7月の0.1%を上回ったと発表しました。前年比は3.4%、食品とエネルギーを除くコアCPIは前月比0.3%、前年比2.4%でした。これは8月の物価統計であり、現在の金価格や次回の金利決定そのものではありません。"
      ] },
      { heading: "当サイトの分析：インフレと金は単純な一方向の関係ではない", paragraphs: [
        "物価上昇は、金に対して逆方向に働き得る二つの経路を持ちます。購買力への懸念が金の価値保存機能に注目を集める一方、それを受けて高めの金利が続くと予想されれば、利息を生まない資産を保有する機会費用も増える可能性があります。「インフレが高いから金も上がる」という見方では、後者が抜け落ちます。",
        "重要なのは次のローソク足を当てることではなく、ニュースが何を変えたかを整理することです。短期的な物価変動なのか、将来のインフレ見通しなのか、それとも金融政策への予想なのか。一つの発表が複数の要因を同時に動かしても、同じ方向を示すとは限りません。これは市場を理解するための枠組みであり、今回の値動きの原因を実証したものではありません。"
      ] },
      { heading: "次に確認する三つの問い", paragraphs: [
        "第一に、単月の変化を長期トレンドへ延長せず、その後の統計で持続性を確認します。第二に、金利とドルの反応を分けて考えます。ドル建て価格の動きと、別の通貨で購入する人の負担は一致しない場合があります。第三に、表示価格が現物、特定限月の先物、販売店の提示価格のどれなのかを確認し、同じ時点の数字で比較します。",
        "台湾の読者は為替と取引費用にも注意が必要です。国際価格は貴金属店での成約価格ではありません。重量単位、純度、加工費、売買スプレッドで最終的な金額は変わります。出典時刻がない数字や、現物と誤表示された先物価格では、現在の購入価格を適切に比較できません。"
      ] },
      { heading: "この記事の範囲", paragraphs: [
        "本記事は公表済みの公式統計を基に当サイトが独自に整理・執筆したものです。リアルタイムの取引シグナル、確実な価格予測、売買指示を提供するものではありません。出来事の日付、記事の公開日、相場データの時刻は区別して扱います。画像はAI生成の概念図であり、ニュース現場の写真ではありません。"
      ] },
    ],
  },
];

export function recentEditorials(locale: NewsLocale, now = Date.now()) {
  return editorials.filter(a => a.locale === locale && Date.parse(a.eventDate) <= now && now - Date.parse(a.eventDate) <= 7 * 86400000);
}
