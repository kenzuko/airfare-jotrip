const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const airlineNames = {
  VN:"Vietnam Airlines",
  VJ:"VietJet Air",
  VU:"Vietravel Airlines",
  QH:"Bamboo Airways",
  "9G":"Sun PhuQuoc Airways"
};

let snapshot = {fares:[],source:{provider:"unknown",freshness:"demo",note:""},generated_at:null};
let activeFilter = "all";

const formatPrice = value => Number.isFinite(value)
  ? new Intl.NumberFormat("vi-VN").format(value) + "đ"
  : "-";

const shortPrice = value => Number.isFinite(value)
  ? (value / 1_000_000).toLocaleString("vi-VN",{maximumFractionDigits:2}) + "tr"
  : "-";

const dateOnly = iso => typeof iso === "string" ? iso.slice(0,10) : "";
const timeOnly = iso => {
  if(typeof iso !== "string" || !iso.includes("T")) return "--:--";
  return iso.slice(11,16);
};

const formatDate = date => date
  ? date.split("-").reverse().slice(0,2).join("/")
  : "-";

function durationLabel(departure,arrival){
  if(!departure || !arrival) return "Chưa có thời lượng";
  const mins = Math.max(0,Math.round((new Date(arrival)-new Date(departure))/60000));
  if(!Number.isFinite(mins)) return "Chưa có thời lượng";
  return `${Math.floor(mins/60)}h${String(mins%60).padStart(2,"0")}`;
}

function periodOf(iso){
  const hour = Number(timeOnly(iso).slice(0,2));
  if(!Number.isFinite(hour)) return "day";
  if(hour < 11) return "morning";
  if(hour >= 17) return "evening";
  return "day";
}

function selectedState(){
  return {
    origin:$("#origin").value,
    destination:$("#destination").value,
    date:$("#departDate").value
  };
}

function routeFares(origin,destination){
  return snapshot.fares.filter(f => f.origin === origin && f.destination === destination);
}

function exactFares(origin,destination,date){
  return routeFares(origin,destination).filter(f => dateOnly(f.departure_at) === date);
}

function median(values){
  const sorted = values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length) return null;
  const mid = Math.floor(sorted.length/2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
}

function minByDay(fares){
  const map = new Map();
  fares.forEach(f => {
    const d = dateOnly(f.departure_at);
    if(!d || !Number.isFinite(f.total_price)) return;
    const prev = map.get(d);
    if(!prev || f.total_price < prev) map.set(d,f.total_price);
  });
  return map;
}

function sevenDayWindow(origin,destination,date){
  const base = date ? new Date(date+"T00:00:00+07:00") : new Date();
  const byDay = minByDay(routeFares(origin,destination));
  return Array.from({length:7},(_,i)=>{
    const d = new Date(base);
    d.setDate(base.getDate()+i-3);
    const key = [
      d.getFullYear(),
      String(d.getMonth()+1).padStart(2,"0"),
      String(d.getDate()).padStart(2,"0")
    ].join("-");
    return {date:key,price:byDay.get(key) ?? null};
  });
}

function fareSignal(dayMin,window){
  const prices = window.map(x=>x.price).filter(Number.isFinite);
  if(!Number.isFinite(dayMin) || prices.length < 2){
    return {label:"Chưa đủ dữ liệu",badge:"NO DATA",className:"neutral",note:"Cần thêm ngày có giá để so sánh."};
  }
  const med = median(prices);
  if(dayMin <= med*0.9) return {label:"Khá tốt",badge:"GOOD FARE",className:"good",note:`Thấp hơn trung vị 7 ngày khoảng ${Math.round((1-dayMin/med)*100)}%.`};
  if(dayMin >= med*1.1) return {label:"Cao",badge:"HIGH FARE",className:"warn",note:`Cao hơn trung vị 7 ngày khoảng ${Math.round((dayMin/med-1)*100)}%.`};
  return {label:"Bình thường",badge:"NORMAL",className:"neutral",note:"Nằm gần trung vị của các ngày lân cận."};
}

function setBadge(el,text,className){
  el.textContent = text;
  el.className = "badge " + className;
}

function renderChart(window){
  const chart = $("#miniChart");
  const values = window.map(x=>x.price).filter(Number.isFinite);
  if(!values.length){
    chart.innerHTML = '<div class="empty-state">Chưa có dữ liệu giá quanh ngày này.</div>';
    return;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  chart.innerHTML = window.map(d => {
    if(!Number.isFinite(d.price)){
      return '<div class="bar-wrap"><div class="bar" style="height:20px;opacity:.12"></div><span class="bar-label">'+formatDate(d.date)+'</span></div>';
    }
    const ratio = (d.price-min)/Math.max(1,max-min);
    const height = 58 + ratio*92;
    const best = d.price === min ? " best" : "";
    return '<div class="bar-wrap"><div class="bar'+best+'" style="height:'+height+'px"><span class="bar-price">'+shortPrice(d.price)+'</span></div><span class="bar-label">'+formatDate(d.date)+'</span></div>';
  }).join("");
}

function renderFareRows(fares){
  const list = $("#fareList");
  const filtered = fares.filter(f => {
    if(activeFilter === "direct") return !!f.direct;
    if(activeFilter === "morning") return periodOf(f.departure_at) === "morning";
    if(activeFilter === "evening") return periodOf(f.departure_at) === "evening";
    return true;
  });

  if(!filtered.length){
    list.innerHTML = '<div class="empty-state">Không có fare record phù hợp chặng, ngày và bộ lọc này.</div>';
    return;
  }

  const prices = filtered.map(f=>f.total_price).filter(Number.isFinite);
  const med = median(prices);
  list.innerHTML = "";

  filtered
    .sort((a,b)=>a.total_price-b.total_price || new Date(a.departure_at)-new Date(b.departure_at))
    .forEach(fare => {
      const node = $("#fareRowTemplate").content.cloneNode(true);
      const code = fare.airline || "?";
      const price = fare.total_price;
      const tag = med && price <= med*.9 ? "GOOD FARE" : med && price >= med*1.1 ? "HIGH FARE" : snapshot.source.freshness.toUpperCase();
      node.querySelector(".airline-code").textContent = code;
      node.querySelector(".airline-name").textContent = fare.airline_name || airlineNames[code] || code;
      node.querySelector(".flight-number").textContent = (code + (fare.flight_number || "")).trim() + (fare.direct ? " · bay thẳng" : "");
      node.querySelector(".time-range").textContent = timeOnly(fare.departure_at) + " → " + timeOnly(fare.arrival_at);
      node.querySelector(".duration").textContent = durationLabel(fare.departure_at,fare.arrival_at);
      node.querySelector(".fare-type").textContent = tag;
      node.querySelector(".fare-note").textContent = snapshot.source.provider || "unknown provider";
      node.querySelector(".price-value").textContent = formatPrice(price);
      node.querySelector(".price-note").textContent = snapshot.source.freshness === "live" ? "Provider xác nhận live" : snapshot.source.freshness === "cached" ? "Giá cached · cần recheck trước khi mua" : "Giá demo · không dùng để mua";
      list.appendChild(node);
    });
}

function renderQuickWatch(window,dayFares){
  const priced = window.filter(x=>Number.isFinite(x.price));
  if(priced.length >= 2){
    const cheapest = [...priced].sort((a,b)=>a.price-b.price)[0];
    $("#watchTitle1").textContent = "Ngày rẻ nhất quanh mốc đang chọn";
    $("#watchText1").textContent = `${formatDate(cheapest.date)} đang có mức thấp nhất trong snapshot: ${formatPrice(cheapest.price)}.`;
  } else {
    $("#watchTitle1").textContent = "Chưa đủ dữ liệu lân cận";
    $("#watchText1").textContent = "Cần thêm fare record quanh ngày chọn để tạo cảnh báo có ý nghĩa.";
  }

  $("#watchTitle2").textContent = snapshot.source.freshness === "cached" ? "Đây là giá cached" : snapshot.source.freshness === "live" ? "Đây là giá live" : "Đây là dữ liệu demo";
  $("#watchText2").textContent = snapshot.source.freshness === "cached"
    ? "Dùng để nhìn mặt bằng và calendar. Trước khi mua cần gọi nguồn live hoặc mở deeplink kiểm tra lại."
    : snapshot.source.freshness === "live"
      ? "Provider vừa xác nhận giá trong phiên hiện tại."
      : "Chỉ dùng kiểm tra giao diện và logic, không đại diện giá thị trường.";
}

function render(){
  const {origin,destination,date} = selectedState();
  $("#boardTitle").textContent = `${origin} → ${destination} · ${formatDate(date)}`;
  $("#heroRoute").textContent = `${origin} → ${destination} · ${formatDate(date)}`;

  if(origin === destination){
    $("#fareList").innerHTML = '<div class="empty-state">Điểm đi và điểm đến đang giống nhau. Hãy đổi một sân bay.</div>';
    $("#heroLowest").textContent = "-";
    return;
  }

  const dayFares = exactFares(origin,destination,date);
  const prices = dayFares.map(f=>f.total_price).filter(Number.isFinite);
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const window = sevenDayWindow(origin,destination,date);
  const signal = fareSignal(min,window);

  $("#heroLowest").textContent = formatPrice(min);
  $("#todayLevel").textContent = signal.label;
  setBadge($("#todayBadge"),signal.badge,signal.className);
  $("#todayLevelNote").textContent = signal.note;

  $("#coverageValue").textContent = dayFares.length ? dayFares.length + " fare" : "0 fare";
  $("#coverageNote").textContent = dayFares.length
    ? "Số bản ghi provider hiện có cho đúng chặng và ngày này."
    : "Snapshot chưa có bản ghi cho đúng chặng và ngày này.";

  $("#rangeValue").textContent = prices.length ? shortPrice(min) + (max !== min ? " - " + shortPrice(max) : "") : "-";
  $("#rangeNote").textContent = snapshot.source.freshness === "cached"
    ? "Khoảng giá cached, không phải inventory live."
    : snapshot.source.freshness === "live"
      ? "Khoảng giá provider vừa xác nhận."
      : "Khoảng giá demo để test giao diện.";

  const freshness = (snapshot.source.freshness || "demo").toUpperCase();
  $("#freshnessText").textContent = freshness;
  setBadge($("#freshnessBadge"),freshness,snapshot.source.freshness === "live" ? "good" : snapshot.source.freshness === "cached" ? "warn" : "neutral");
  renderFareRows(dayFares);
  renderChart(window);
  renderQuickWatch(window,dayFares);
}

async function loadSnapshot(){
  try{
    const response = await fetch("data/fares.json",{cache:"no-store"});
    if(!response.ok) throw new Error("HTTP "+response.status);
    snapshot = await response.json();
  }catch(error){
    const response = await fetch("data/demo-fares.json",{cache:"no-store"});
    snapshot = await response.json();
    snapshot.source.note = "Không đọc được snapshot chính. Đang dùng demo fallback.";
  }

  snapshot.fares = Array.isArray(snapshot.fares) ? snapshot.fares : [];
  const freshness = snapshot.source?.freshness || "demo";
  $("#topStatus").textContent = freshness === "live" ? "Live source" : freshness === "cached" ? "Cached fare data" : "Demo data";
  $("#sourceNote").textContent = snapshot.source?.note || "Không có ghi chú nguồn dữ liệu.";
  $("#lastUpdated").textContent = snapshot.generated_at
    ? "Snapshot: " + new Date(snapshot.generated_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})
    : "Không rõ thời điểm snapshot";

  const dates = routeFares("SGN","PQC").map(f=>dateOnly(f.departure_at)).filter(Boolean).sort();
  $("#departDate").value = dates.includes("2026-09-23") ? "2026-09-23" : dates[0] || new Date().toISOString().slice(0,10);
  render();
}

$$(".filter").forEach(btn => {
  btn.addEventListener("click",()=>{
    $$(".filter").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    render();
  });
});

$("#swapRoute").addEventListener("click",()=>{
  const origin=$("#origin"),destination=$("#destination");
  [origin.value,destination.value]=[destination.value,origin.value];
  render();
});

$("#searchBtn").addEventListener("click",()=>{
  activeFilter="all";
  $$(".filter").forEach(x=>x.classList.toggle("active",x.dataset.filter==="all"));
  render();
});

loadSnapshot();
