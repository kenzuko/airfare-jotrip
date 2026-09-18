import { mkdir, readFile, writeFile } from "node:fs/promises";

const token = process.env.TRAVELPAYOUTS_TOKEN?.trim();
const out = "data/fares.json";
const fallback = "data/demo-fares.json";
const routes = [
  ["SGN","PQC"],["HAN","PQC"],["DAD","PQC"],
  ["PQC","SGN"],["PQC","HAN"],["PQC","DAD"]
];

const airlineNames = {
  VN:"Vietnam Airlines",
  VJ:"VietJet Air",
  VU:"Vietravel Airlines",
  QH:"Bamboo Airways",
  "9G":"Sun PhuQuoc Airways"
};

function monthsFromNow(count=2){
  const now = new Date();
  return Array.from({length:count},(_,i)=>{
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+i, 1));
    return d.toISOString().slice(0,7);
  });
}

function normalize(item, origin, destination){
  const departure = item.departure_at || item.depart_date || item.departure_date;
  const durationMinutes = Number(item.duration || item.trip_duration || 0);
  let arrival = item.arrival_at || null;
  if(!arrival && departure && durationMinutes > 0){
    arrival = new Date(new Date(departure).getTime() + durationMinutes * 60000).toISOString();
  }
  const airline = item.airline || item.airline_code || "";
  return {
    origin,
    destination,
    departure_at: departure || null,
    arrival_at: arrival,
    airline,
    airline_name: airlineNames[airline] || airline,
    flight_number: String(item.flight_number || ""),
    direct: Number(item.transfers ?? item.number_of_changes ?? 0) === 0,
    total_price: Number(item.price ?? item.value ?? 0),
    currency: "VND",
    provider_found_at: item.found_at || null,
    expires_at: item.expires_at || null,
    deeplink: item.link || item.ticket_link || null
  };
}

async function getRoute(origin,destination,month){
  const url = new URL("https://api.travelpayouts.com/aviasales/v3/prices_for_dates");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("departure_at", month);
  url.searchParams.set("one_way", "true");
  url.searchParams.set("direct", "true");
  url.searchParams.set("currency", "vnd");
  url.searchParams.set("sorting", "price");
  url.searchParams.set("limit", "100");
  url.searchParams.set("page", "1");

  const response = await fetch(url, {
    headers: {"X-Access-Token": token, "Accept":"application/json"}
  });
  if(!response.ok) throw new Error(`${origin}-${destination} ${month}: HTTP ${response.status}`);
  const json = await response.json();
  if(!json?.success || !Array.isArray(json.data)) return [];
  return json.data.map(item => normalize(item,origin,destination))
    .filter(x => x.departure_at && Number.isFinite(x.total_price) && x.total_price > 0);
}

await mkdir("data",{recursive:true});

if(!token){
  const demo = JSON.parse(await readFile(fallback,"utf8"));
  demo.generated_at = new Date().toISOString();
  demo.source.note = "Chưa cấu hình TRAVELPAYOUTS_TOKEN. Đang dùng dữ liệu demo.";
  await writeFile(out,JSON.stringify(demo,null,2)+"\n");
  console.log("TRAVELPAYOUTS_TOKEN missing - demo fallback written.");
  process.exit(0);
}

const months = monthsFromNow(2);
const jobs = routes.flatMap(([o,d]) => months.map(m => getRoute(o,d,m)));
const settled = await Promise.allSettled(jobs);
const fares = settled.flatMap(x => x.status === "fulfilled" ? x.value : []);
const failures = settled.filter(x => x.status === "rejected").map(x => x.reason?.message || String(x.reason));

if(!fares.length){
  const demo = JSON.parse(await readFile(fallback,"utf8"));
  demo.generated_at = new Date().toISOString();
  demo.source.note = "Provider không trả được dữ liệu dùng được ở lần cập nhật này. Đang dùng demo fallback.";
  demo.source.provider = "demo-fallback";
  await writeFile(out,JSON.stringify(demo,null,2)+"\n");
  console.warn("No usable provider fares. Fallback used.", failures);
  process.exit(0);
}

fares.sort((a,b) => new Date(a.departure_at) - new Date(b.departure_at) || a.total_price-b.total_price);
const payload = {
  schema_version:1,
  generated_at:new Date().toISOString(),
  source:{
    provider:"travelpayouts-aviasales",
    freshness:"cached",
    note:"Giá cached từ lịch sử tìm kiếm Aviasales. Không phải xác nhận giá live tại thời điểm mở trang.",
    failures
  },
  fares
};

await writeFile(out,JSON.stringify(payload,null,2)+"\n");
console.log(`Wrote ${fares.length} cached fare records to ${out}`);
