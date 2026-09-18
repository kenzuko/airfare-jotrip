const fares = [
  { airline:"VietJet Air", code:"VJ", flight:"VJ331", depart:"06:25", arrive:"07:30", duration:"1h05", direct:true, period:"morning", price:1090000, tag:"GOOD FARE", note:"Giá thấp nhất demo" },
  { airline:"Vietnam Airlines", code:"VN", flight:"VN1821", depart:"08:10", arrive:"09:20", duration:"1h10", direct:true, period:"morning", price:1480000, tag:"NORMAL", note:"Mức giá trung bình" },
  { airline:"Vietravel Airlines", code:"VU", flight:"VU303", depart:"11:40", arrive:"12:45", duration:"1h05", direct:true, period:"day", price:1260000, tag:"GOOD FARE", note:"Thấp hơn median demo" },
  { airline:"Sun PhuQuoc Airways", code:"9G", flight:"9G128", depart:"15:20", arrive:"16:30", duration:"1h10", direct:true, period:"day", price:1390000, tag:"NORMAL", note:"Giá demo" },
  { airline:"Vietnam Airlines", code:"VN", flight:"VN1835", depart:"18:05", arrive:"19:15", duration:"1h10", direct:true, period:"evening", price:1890000, tag:"RISING", note:"Nhóm giờ tối cao hơn" },
  { airline:"VietJet Air", code:"VJ", flight:"VJ347", depart:"20:10", arrive:"21:15", duration:"1h05", direct:true, period:"evening", price:1640000, tag:"RISING", note:"Tăng so với sáng demo" }
];

const sevenDays = [
  {day:"21/09", price:1340000},
  {day:"22/09", price:1210000},
  {day:"23/09", price:1090000},
  {day:"24/09", price:1180000},
  {day:"25/09", price:1470000},
  {day:"26/09", price:1730000},
  {day:"27/09", price:1680000}
];

const fareList = document.querySelector("#fareList");
const template = document.querySelector("#fareRowTemplate");
const formatPrice = value => new Intl.NumberFormat("vi-VN").format(value) + "đ";
const shortPrice = value => (value / 1000000).toLocaleString("vi-VN",{maximumFractionDigits:2}) + "tr";

function renderFares(filter="all"){
  const filtered = fares.filter(f => {
    if(filter === "all") return true;
    if(filter === "direct") return f.direct;
    if(filter === "morning") return f.period === "morning";
    if(filter === "evening") return f.period === "evening";
    return true;
  });

  fareList.innerHTML = "";

  if(!filtered.length){
    fareList.innerHTML = '<div class="empty-state">Không có chuyến phù hợp bộ lọc này.</div>';
    return;
  }

  filtered.forEach(fare => {
    const node = template.content.cloneNode(true);
    node.querySelector(".airline-code").textContent = fare.code;
    node.querySelector(".airline-name").textContent = fare.airline;
    node.querySelector(".flight-number").textContent = fare.flight + " · bay thẳng";
    node.querySelector(".time-range").textContent = fare.depart + " → " + fare.arrive;
    node.querySelector(".duration").textContent = fare.duration;
    node.querySelector(".fare-type").textContent = fare.tag;
    node.querySelector(".fare-note").textContent = fare.note;
    node.querySelector(".price-value").textContent = formatPrice(fare.price);
    fareList.appendChild(node);
  });
}

function renderChart(){
  const chart = document.querySelector("#miniChart");
  const min = Math.min(...sevenDays.map(d => d.price));
  const max = Math.max(...sevenDays.map(d => d.price));

  chart.innerHTML = sevenDays.map(d => {
    const ratio = (d.price - min) / Math.max(1, max - min);
    const height = 58 + ratio * 92;
    const best = d.price === min ? " best" : "";
    return '<div class="bar-wrap">' +
      '<div class="bar' + best + '" style="height:' + height + 'px">' +
      '<span class="bar-price">' + shortPrice(d.price) + '</span></div>' +
      '<span class="bar-label">' + d.day + '</span></div>';
  }).join("");
}

document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    renderFares(btn.dataset.filter);
  });
});

document.querySelector("#swapRoute").addEventListener("click", () => {
  const origin = document.querySelector("#origin");
  const destination = document.querySelector("#destination");
  const tmp = origin.value;
  origin.value = destination.value;
  destination.value = tmp;
});

document.querySelector("#searchBtn").addEventListener("click", () => {
  const origin = document.querySelector("#origin").value;
  const destination = document.querySelector("#destination").value;
  const date = document.querySelector("#departDate").value;
  const displayDate = date ? date.split("-").reverse().slice(0,2).join("/") : "chưa chọn";
  document.querySelector("#boardTitle").textContent = origin + " → " + destination + " · " + displayDate;

  if(origin === destination){
    fareList.innerHTML = '<div class="empty-state">Điểm đi và điểm đến đang giống nhau. Hãy đổi một sân bay.</div>';
    return;
  }

  renderFares("all");
  document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
  document.querySelector('.filter[data-filter="all"]').classList.add("active");
});

renderFares();
renderChart();