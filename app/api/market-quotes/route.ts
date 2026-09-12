import { NextResponse } from "next/server";
import { GET as getGlobalQuotes } from "../global-quotes/route";
export async function GET() {
 try {
  const response=await getGlobalQuotes();
  if(!response.ok)throw new Error("Source unavailable");
  const data=await response.json();
  const gold=data.metals.find((m:{id:string})=>m.id==="gold");
  if(!gold?.price||!gold.quotedAt)throw new Error("Gold unavailable");
  const items=[{label:"黃金期貨參考",code:"GC=F · Yahoo Finance",price:gold.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),unit:"USD／金衡盎司",change:"可能延遲，非現貨",up:gold.changePercent>=0}];
  const rate=data.currencies.TWD;
  if(Number.isFinite(rate)&&rate>0)items.push({label:"美元參考匯率",code:"USD / TWD · ExchangeRate-API",price:rate.toFixed(4),unit:"新台幣",change:"非銀行即期牌告",up:false});
  return NextResponse.json({items,updatedAt:new Date(gold.quotedAt).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"}),source:"Yahoo Finance GC futures; ExchangeRate-API"},{headers:{"Cache-Control":"public, max-age=180"}});
 }catch{return NextResponse.json({items:[],updatedAt:"資料暫不可用"},{status:503,headers:{"Cache-Control":"no-store"}});}
}
