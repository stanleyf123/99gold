export type GoldMarketStatus = "open" | "delayed" | "daily-break" | "weekend-closed" | "unavailable";

function getNewYorkClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: "weekday" | "hour" | "minute") => parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekday: value("weekday"),
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

export function getGoldMarketStatus(now: Date, quotedAt: string): GoldMarketStatus {
  const quoteTime = Date.parse(quotedAt);
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(quoteTime) || quoteTime > now.getTime() + 5 * 60_000) {
    return "unavailable";
  }

  const { weekday, minutes } = getNewYorkClock(now);
  const dailyClose = 17 * 60;
  const dailyOpen = 18 * 60;
  const weekendClosed = weekday === "Sat"
    || (weekday === "Fri" && minutes >= dailyClose)
    || (weekday === "Sun" && minutes < dailyOpen);
  if (weekendClosed) return "weekend-closed";
  if (minutes >= dailyClose && minutes < dailyOpen) return "daily-break";

  return now.getTime() - quoteTime > 20 * 60_000 ? "delayed" : "open";
}
