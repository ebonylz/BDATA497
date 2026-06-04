// ========================================
// SEATTLE 911 CALLS — DATA NARRATIVE
// main.js  |  D3 v7
// ========================================
// Loads 2020 and 2025 911 CSV datasets,
// counts event groups, and draws five charts:
//   1. Horizontal bar  — 2025 top categories
//   2. Dumbbell        — 2020 vs 2025 compare
//   3. Diverging bar   — biggest changes
//   4. Grouped bar     — calls by shift/time of day
//   5. Dumbbell        — calls by precinct
//
// Colors from UW Brand Guidelines:
//   Spirit Purple  #4b2e83
//   Husky Gold     #b7a57a
//   Spirit Gold    #ffc700
// Source: https://www.washington.edu/brand/brand-elements/colors/
// ========================================

const UW_PURPLE = "#4b2e83";  // Spirit Purple
const UW_GOLD = "#b7a57a";  // Husky Gold (2020 dots)
const UW_SPIRIT_G = "#ffc700";  // Spirit Gold (accent)
const C_POSITIVE = "#2e7d32";  // dark green for increases
const C_NEGATIVE = "#c62828";  // dark red for decreases

// Shared tooltip element
const tooltip = d3.select("#tooltip");

function showTip(html, event) {
  tooltip.html(html)
    .style("opacity", 1)
    .style("left", (event.pageX + 14) + "px")
    .style("top", (event.pageY - 32) + "px");
}
function hideTip() {
  tooltip.style("opacity", 0);
}


// ========================================
// LOAD CSV DATA
// ========================================

Promise.all([
  d3.csv("2020_911_Calls.csv"),
  d3.csv("2025_911_Calls.csv"),
  d3.csv("Seattle_Population.csv")
]).then(([data2020, data2025, populationData]) => {

  d3.select("#stat-total-2020").text(d3.format(",")(data2020.length));
  d3.select("#stat-total-2025").text(d3.format(",")(data2025.length));

  const counts2020 = countEventGroups(data2020);
  const counts2025 = countEventGroups(data2025);

  d3.select("#stat-top-cat").text(counts2025[0]?.eventGroup ?? "—");

  drawBarChart(counts2025);
  drawCompareChart(counts2020, counts2025);
  drawStandardizedChart(counts2020, counts2025, populationData);
  drawChangeChart(counts2020, counts2025);
  drawShiftChart(data2020, data2025);
  drawStandardizedShiftChart(data2020, data2025, populationData);
  drawPrecinctChart(data2020, data2025);
  drawHourHeatmap(data2020, data2025, populationData);
  drawPriorityRateChart(data2020, data2025, populationData);
  drawEventPriorityHeatmap(data2025);
});


// ========================================
// HELPER: COUNT EVENT GROUPS
// ========================================

function countEventGroups(data) {
  // Rolls up rows by Event Group field, returns sorted array
  return Array.from(
    d3.rollup(
      data.filter(d => d["Event Group"] && d["Event Group"].trim() !== ""),
      v => v.length,
      d => d["Event Group"].trim()
    ),
    ([eventGroup, count]) => ({ eventGroup, count })
  ).sort((a, b) => b.count - a.count);
}


// ========================================
// CHART 1 — 2025 TOP CATEGORIES (BAR)
// ========================================

function drawBarChart(data) {
  const topData = data.slice(0, 12);

  const margin = { top: 12, right: 80, bottom: 44, left: 240 };
  const width = 860 - margin.left - margin.right;
  const height = 460 - margin.top - margin.bottom;

  const svg = d3.select("#bar-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(topData, d => d.count) * 1.15])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(topData.map(d => d.eventGroup))
    .range([0, height])
    .padding(0.22);

  // Subtle vertical grid lines
  g.append("g").attr("class", "grid")
    .call(d3.axisBottom(x).ticks(5).tickSize(height).tickFormat(""))
    .call(gg => gg.select(".domain").remove());

  // Bars
  g.selectAll(".bar")
    .data(topData)
    .join("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => y(d.eventGroup))
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.count))
    .on("mouseover", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>${d3.format(",")(d.count)} calls`, event))
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>${d3.format(",")(d.count)} calls`, event))
    .on("mouseout", hideTip);

  // Value labels
  g.selectAll(".val-label")
    .data(topData)
    .join("text")
    .attr("class", "label")
    .attr("x", d => x(d.count) + 6)
    .attr("y", d => y(d.eventGroup) + y.bandwidth() / 2 + 4)
    .text(d => d3.format(",")(d.count));

  // Y axis
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .call(gg => gg.select(".domain").remove())
    .selectAll("text").attr("dx", "-8");

  // X axis
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(",")))
    .call(gg => gg.select(".domain").remove());
}


// ========================================
// CHART 2 — DUMBBELL 2020 VS 2025
// ========================================

function drawCompareChart(data2020, data2025) {
  const map2020 = new Map(data2020.map(d => [d.eventGroup, d.count]));
  const map2025 = new Map(data2025.map(d => [d.eventGroup, d.count]));

  // Use top 12 from 2025
  const categories = data2025.slice(0, 12).map(d => d.eventGroup);
  const compareData = categories.map(group => ({
    eventGroup: group,
    count2020: map2020.get(group) || 0,
    count2025: map2025.get(group) || 0
  }));

  const margin = { top: 12, right: 80, bottom: 44, left: 240 };
  const width = 860 - margin.left - margin.right;
  const height = 480 - margin.top - margin.bottom;

  const svg = d3.select("#compare-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const maxVal = d3.max(compareData, d => Math.max(d.count2020, d.count2025));
  const x = d3.scaleLinear().domain([0, maxVal * 1.1]).range([0, width]);
  const y = d3.scaleBand()
    .domain(compareData.map(d => d.eventGroup))
    .range([0, height]).padding(0.3);

  // Grid
  g.append("g").attr("class", "grid")
    .call(d3.axisBottom(x).ticks(5).tickSize(height).tickFormat(""))
    .call(gg => gg.select(".domain").remove());

  // Connector lines
  g.selectAll(".connector")
    .data(compareData)
    .join("line")
    .attr("x1", d => x(d.count2020))
    .attr("x2", d => x(d.count2025))
    .attr("y1", d => y(d.eventGroup) + y.bandwidth() / 2)
    .attr("y2", d => y(d.eventGroup) + y.bandwidth() / 2)
    .attr("stroke", "#ccc")
    .attr("stroke-width", 2);

  // 2020 dots (Husky Gold)
  g.selectAll(".dot-2020")
    .data(compareData)
    .join("circle")
    .attr("cx", d => x(d.count2020))
    .attr("cy", d => y(d.eventGroup) + y.bandwidth() / 2)
    .attr("r", 7)
    .attr("fill", UW_GOLD)
    .attr("stroke", "white").attr("stroke-width", 1.5)
    .on("mouseover", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>2020: ${d3.format(",")(d.count2020)} calls`, event))
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>2020: ${d3.format(",")(d.count2020)} calls`, event))
    .on("mouseout", hideTip);

  // 2025 dots (Spirit Purple)
  g.selectAll(".dot-2025")
    .data(compareData)
    .join("circle")
    .attr("cx", d => x(d.count2025))
    .attr("cy", d => y(d.eventGroup) + y.bandwidth() / 2)
    .attr("r", 7)
    .attr("fill", UW_PURPLE)
    .attr("stroke", "white").attr("stroke-width", 1.5)
    .on("mouseover", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>2025: ${d3.format(",")(d.count2025)} calls`, event))
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>2025: ${d3.format(",")(d.count2025)} calls`, event))
    .on("mouseout", hideTip);

  // Y axis
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .call(gg => gg.select(".domain").remove())
    .selectAll("text").attr("dx", "-8");

  // X axis
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(",")))
    .call(gg => gg.select(".domain").remove());
}

// ========================================
// CHART 2B — STANDARDIZED CALL RATE BY RESIDENTS
// ========================================

function drawStandardizedChart(data2020, data2025, populationData) {
  const pop2020 = +populationData.find(d => +d.Year === 2020).Population;
  const pop2025 = +populationData.find(d => +d.Year === 2025).Population;

  const map2020 = new Map(data2020.map(d => [d.eventGroup, d.count]));
  const map2025 = new Map(data2025.map(d => [d.eventGroup, d.count]));

  const categories = data2025.slice(0, 12).map(d => d.eventGroup);

  const rateData = categories.map(group => ({
    eventGroup: group,
    rate2020: ((map2020.get(group) || 0) / pop2020) * 100000,
    rate2025: ((map2025.get(group) || 0) / pop2025) * 100000
  }));

  const margin = { top: 12, right: 90, bottom: 44, left: 240 };
  const width = 860 - margin.left - margin.right;
  const height = 480 - margin.top - margin.bottom;

  const svg = d3.select("#standardized-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const maxVal = d3.max(rateData, d => Math.max(d.rate2020, d.rate2025));

  const x = d3.scaleLinear()
    .domain([0, maxVal * 1.1])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(rateData.map(d => d.eventGroup))
    .range([0, height])
    .padding(0.3);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisBottom(x).ticks(5).tickSize(height).tickFormat(""))
    .call(gg => gg.select(".domain").remove());

  g.selectAll(".rate-line")
    .data(rateData)
    .join("line")
    .attr("x1", d => x(d.rate2020))
    .attr("x2", d => x(d.rate2025))
    .attr("y1", d => y(d.eventGroup) + y.bandwidth() / 2)
    .attr("y2", d => y(d.eventGroup) + y.bandwidth() / 2)
    .attr("stroke", "#ccc")
    .attr("stroke-width", 2);

  g.selectAll(".rate-dot-2020")
    .data(rateData)
    .join("circle")
    .attr("cx", d => x(d.rate2020))
    .attr("cy", d => y(d.eventGroup) + y.bandwidth() / 2)
    .attr("r", 7)
    .attr("fill", UW_GOLD)
    .attr("stroke", "white")
    .attr("stroke-width", 1.5)
    .on("mouseover", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>2020: ${d.rate2020.toFixed(1)} calls per 100,000 residents`, event))
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>2020: ${d.rate2020.toFixed(1)} calls per 100,000 residents`, event))
    .on("mouseout", hideTip);

  g.selectAll(".rate-dot-2025")
    .data(rateData)
    .join("circle")
    .attr("cx", d => x(d.rate2025))
    .attr("cy", d => y(d.eventGroup) + y.bandwidth() / 2)
    .attr("r", 7)
    .attr("fill", UW_PURPLE)
    .attr("stroke", "white")
    .attr("stroke-width", 1.5)
    .on("mouseover", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>2025: ${d.rate2025.toFixed(1)} calls per 100,000 residents`, event))
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>2025: ${d.rate2025.toFixed(1)} calls per 100,000 residents`, event))
    .on("mouseout", hideTip);

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .call(gg => gg.select(".domain").remove())
    .selectAll("text")
    .attr("dx", "-8");

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => d.toFixed(0)))
    .call(gg => gg.select(".domain").remove());
}

// ========================================
// CHART 3 — DIVERGING CHANGE BAR
// ========================================

function drawChangeChart(data2020, data2025) {
  const map2020 = new Map(data2020.map(d => [d.eventGroup, d.count]));
  const map2025 = new Map(data2025.map(d => [d.eventGroup, d.count]));

  const allGroups = Array.from(new Set([
    ...data2020.map(d => d.eventGroup),
    ...data2025.map(d => d.eventGroup)
  ]));

  // Calculate net change, take top 14 by absolute size
  const changeData = allGroups
    .map(group => ({
      eventGroup: group,
      change: (map2025.get(group) || 0) - (map2020.get(group) || 0)
    }))
    .filter(d => Math.abs(d.change) > 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 14)
    .sort((a, b) => b.change - a.change);

  const margin = { top: 12, right: 100, bottom: 44, left: 240 };
  const width = 860 - margin.left - margin.right;
  const height = 520 - margin.top - margin.bottom;

  const svg = d3.select("#change-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const ext = d3.max(changeData, d => Math.abs(d.change));
  const x = d3.scaleLinear().domain([-ext * 1.1, ext * 1.1]).range([0, width]);
  const y = d3.scaleBand()
    .domain(changeData.map(d => d.eventGroup))
    .range([0, height]).padding(0.25);

  // Zero line
  g.append("line")
    .attr("x1", x(0)).attr("x2", x(0))
    .attr("y1", 0).attr("y2", height)
    .attr("stroke", "#999").attr("stroke-width", 1.5);

  // Bars
  g.selectAll(".change-bar")
    .data(changeData)
    .join("rect")
    .attr("x", d => d.change >= 0 ? x(0) : x(d.change))
    .attr("y", d => y(d.eventGroup))
    .attr("width", d => Math.abs(x(d.change) - x(0)))
    .attr("height", y.bandwidth())
    .attr("fill", d => d.change >= 0 ? C_POSITIVE : C_NEGATIVE)
    .attr("opacity", 0.88)
    .on("mouseover", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>Net change: ${d3.format("+,")(d.change)}`, event))
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.eventGroup}</strong><br>Net change: ${d3.format("+,")(d.change)}`, event))
    .on("mouseout", hideTip);

  // Value labels
  g.selectAll(".change-label")
    .data(changeData)
    .join("text")
    .attr("class", "label")
    .attr("x", d => d.change >= 0 ? x(d.change) + 5 : x(d.change) - 5)
    .attr("y", d => y(d.eventGroup) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", d => d.change >= 0 ? "start" : "end")
    .text(d => d3.format("+,")(d.change));

  // Legend
  const legend = g.append("g").attr("transform", `translate(${width - 170}, -10)`);
  legend.append("rect").attr("width", 12).attr("height", 12).attr("fill", C_POSITIVE);
  legend.append("text").attr("class", "label").attr("x", 16).attr("y", 11).text("Increased");
  legend.append("rect").attr("x", 90).attr("width", 12).attr("height", 12).attr("fill", C_NEGATIVE);
  legend.append("text").attr("class", "label").attr("x", 106).attr("y", 11).text("Decreased");

  // Y axis
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .call(gg => gg.select(".domain").remove())
    .selectAll("text").attr("dx", "-8");

  // X axis
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(",")))
    .call(gg => gg.select(".domain").remove());
}


// ========================================
// CHART 4 — GROUPED BAR BY SHIFT
// ========================================

function drawShiftChart(data2020, data2025) {
  const parseTime = d3.timeParse("%Y %b %d %I:%M:%S %p");

  // Assigns each call row to a shift based on arrival hour
  function assignShift(d) {
    const t = parseTime(d["CAD Event Arrived Time"]);
    if (!t) return null;
    const h = t.getHours();
    if (h >= 6 && h < 14) return "6AM–2PM";
    if (h >= 14 && h < 22) return "2PM–10PM";
    return "10PM–6AM";
  }

  function shiftCounts(data) {
    return d3.rollup(
      data.map(d => ({ ...d, shift: assignShift(d) })).filter(d => d.shift),
      v => v.length,
      d => d.shift
    );
  }

  const c2020 = shiftCounts(data2020);
  const c2025 = shiftCounts(data2025);
  const shiftOrder = ["6AM–2PM", "2PM–10PM", "10PM–6AM"];

  const shiftData = shiftOrder.map(s => ({
    shift: s,
    count2020: c2020.get(s) || 0,
    count2025: c2025.get(s) || 0
  }));

  const margin = { top: 24, right: 40, bottom: 52, left: 80 };
  const width = 740 - margin.left - margin.right;
  const height = 380 - margin.top - margin.bottom;

  const svg = d3.select("#shift-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand().domain(shiftOrder).range([0, width]).padding(0.28);
  const x1 = d3.scaleBand().domain(["2020", "2025"]).range([0, x0.bandwidth()]).padding(0.1);
  const maxY = d3.max(shiftData, d => Math.max(d.count2020, d.count2025));
  const y = d3.scaleLinear().domain([0, maxY * 1.12]).range([height, 0]);

  // Horizontal grid
  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
    .call(gg => gg.select(".domain").remove());

  // Grouped bars
  const groups = g.selectAll(".grp")
    .data(shiftData)
    .join("g")
    .attr("transform", d => `translate(${x0(d.shift)},0)`);

  groups.selectAll("rect")
    .data(d => [
      { year: "2020", count: d.count2020, shift: d.shift },
      { year: "2025", count: d.count2025, shift: d.shift }
    ])
    .join("rect")
    .attr("x", d => x1(d.year))
    .attr("y", d => y(d.count))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.count))
    .attr("fill", d => d.year === "2020" ? UW_GOLD : UW_PURPLE)
    .on("mouseover", (event, d) =>
      showTip(`<strong>${d.shift} — ${d.year}</strong><br>${d3.format(",")(d.count)} calls`, event))
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.shift} — ${d.year}</strong><br>${d3.format(",")(d.count)} calls`, event))
    .on("mouseout", hideTip);

  // Count labels above bars
  groups.selectAll(".top-label")
    .data(d => [
      { year: "2020", count: d.count2020 },
      { year: "2025", count: d.count2025 }
    ])
    .join("text")
    .attr("class", "label")
    .attr("x", d => x1(d.year) + x1.bandwidth() / 2)
    .attr("y", d => y(d.count) - 5)
    .attr("text-anchor", "middle")
    .text(d => d3.format(",")(d.count));

  // Axes
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .call(gg => gg.select(".domain").remove())
    .selectAll("text").style("font-size", "13px");

  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")))
    .call(gg => gg.select(".domain").remove());
}

// ========================================
// CHART 4B — STANDARDIZED SHIFT CHART
// Calls per 100,000 residents
// ========================================

function drawStandardizedShiftChart(data2020, data2025, populationData) {
  const parseTime = d3.timeParse("%Y %b %d %I:%M:%S %p");

  const pop2020 = +populationData.find(d => +d.Year === 2020).Population;
  const pop2025 = +populationData.find(d => +d.Year === 2025).Population;

  function assignShift(d) {
    const t = parseTime(d["CAD Event Arrived Time"]);
    if (!t) return null;

    const h = t.getHours();

    if (h >= 6 && h < 14) return "6AM–2PM";
    if (h >= 14 && h < 22) return "2PM–10PM";
    return "10PM–6AM";
  }

  function shiftCounts(data) {
    return d3.rollup(
      data
        .map(d => ({ ...d, shift: assignShift(d) }))
        .filter(d => d.shift),
      v => v.length,
      d => d.shift
    );
  }

  const c2020 = shiftCounts(data2020);
  const c2025 = shiftCounts(data2025);

  const shiftOrder = ["6AM–2PM", "2PM–10PM", "10PM–6AM"];

  const shiftData = shiftOrder.map(shift => ({
    shift: shift,
    rate2020: ((c2020.get(shift) || 0) / pop2020) * 100000,
    rate2025: ((c2025.get(shift) || 0) / pop2025) * 100000
  }));

  const margin = { top: 24, right: 40, bottom: 52, left: 80 };
  const width = 740 - margin.left - margin.right;
  const height = 380 - margin.top - margin.bottom;

  const svg = d3.select("#standardized-shift-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand()
    .domain(shiftOrder)
    .range([0, width])
    .padding(0.28);

  const x1 = d3.scaleBand()
    .domain(["2020", "2025"])
    .range([0, x0.bandwidth()])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([
      0,
      d3.max(shiftData, d => Math.max(d.rate2020, d.rate2025)) * 1.12
    ])
    .range([height, 0]);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
    .call(gg => gg.select(".domain").remove());

  const groups = g.selectAll(".std-shift-group")
    .data(shiftData)
    .join("g")
    .attr("transform", d => `translate(${x0(d.shift)},0)`);

  groups.selectAll("rect")
    .data(d => [
      { year: "2020", rate: d.rate2020, shift: d.shift },
      { year: "2025", rate: d.rate2025, shift: d.shift }
    ])
    .join("rect")
    .attr("x", d => x1(d.year))
    .attr("y", d => y(d.rate))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.rate))
    .attr("fill", d => d.year === "2020" ? UW_GOLD : UW_PURPLE)
    .on("mouseover", (event, d) =>
      showTip(`<strong>${d.shift} — ${d.year}</strong><br>${d.rate.toFixed(1)} calls per 100,000 residents`, event))
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.shift} — ${d.year}</strong><br>${d.rate.toFixed(1)} calls per 100,000 residents`, event))
    .on("mouseout", hideTip);

  groups.selectAll(".std-shift-label")
    .data(d => [
      { year: "2020", rate: d.rate2020 },
      { year: "2025", rate: d.rate2025 }
    ])
    .join("text")
    .attr("class", "label")
    .attr("x", d => x1(d.year) + x1.bandwidth() / 2)
    .attr("y", d => y(d.rate) - 5)
    .attr("text-anchor", "middle")
    .text(d => d.rate.toFixed(1));

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .call(gg => gg.select(".domain").remove());

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d.toFixed(0)))
    .call(gg => gg.select(".domain").remove());
}


// ========================================
// CHART 5 — DUMBBELL BY PRECINCT
// ========================================

function drawPrecinctChart(data2020, data2025) {
  // Count calls by precinct for each year
  function precinctCounts(data) {
    return d3.rollup(
      data.filter(d => d["Dispatch Precinct"]?.trim()),
      v => v.length,
      d => d["Dispatch Precinct"].trim()
    );
  }

  const c2020 = precinctCounts(data2020);
  const c2025 = precinctCounts(data2025);

  const allPrecincts = Array.from(new Set([...c2020.keys(), ...c2025.keys()]));
  const precinctData = allPrecincts
    .map(p => ({ precinct: p, count2020: c2020.get(p) || 0, count2025: c2025.get(p) || 0 }))
    .sort((a, b) => b.count2025 - a.count2025);

  const margin = { top: 12, right: 90, bottom: 44, left: 140 };
  const width = 700 - margin.left - margin.right;
  const height = 340 - margin.top - margin.bottom;

  const svg = d3.select("#precinct-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const maxVal = d3.max(precinctData, d => Math.max(d.count2020, d.count2025));
  const x = d3.scaleLinear().domain([0, maxVal * 1.1]).range([0, width]);
  const y = d3.scaleBand()
    .domain(precinctData.map(d => d.precinct))
    .range([0, height]).padding(0.35);

  // Grid
  g.append("g").attr("class", "grid")
    .call(d3.axisBottom(x).ticks(5).tickSize(height).tickFormat(""))
    .call(gg => gg.select(".domain").remove());

  // Connector lines
  g.selectAll(".p-connector")
    .data(precinctData)
    .join("line")
    .attr("x1", d => x(d.count2020))
    .attr("x2", d => x(d.count2025))
    .attr("y1", d => y(d.precinct) + y.bandwidth() / 2)
    .attr("y2", d => y(d.precinct) + y.bandwidth() / 2)
    .attr("stroke", "#ccc").attr("stroke-width", 2);

  // 2020 dots (gold)
  g.selectAll(".p-dot-2020")
    .data(precinctData)
    .join("circle")
    .attr("cx", d => x(d.count2020))
    .attr("cy", d => y(d.precinct) + y.bandwidth() / 2)
    .attr("r", 8).attr("fill", UW_GOLD)
    .attr("stroke", "white").attr("stroke-width", 1.5)
    .on("mouseover", (event, d) =>
      showTip(`<strong>${d.precinct} — 2020</strong><br>${d3.format(",")(d.count2020)} calls`, event))
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.precinct} — 2020</strong><br>${d3.format(",")(d.count2020)} calls`, event))
    .on("mouseout", hideTip);

  // 2025 dots (purple)
  g.selectAll(".p-dot-2025")
    .data(precinctData)
    .join("circle")
    .attr("cx", d => x(d.count2025))
    .attr("cy", d => y(d.precinct) + y.bandwidth() / 2)
    .attr("r", 8).attr("fill", UW_PURPLE)
    .attr("stroke", "white").attr("stroke-width", 1.5)
    .on("mouseover", (event, d) =>
      showTip(`<strong>${d.precinct} — 2025</strong><br>${d3.format(",")(d.count2025)} calls`, event))
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.precinct} — 2025</strong><br>${d3.format(",")(d.count2025)} calls`, event))
    .on("mouseout", hideTip);

  // Axes
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .call(gg => gg.select(".domain").remove())
    .selectAll("text").attr("dx", "-8").style("font-size", "13px");

  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(",")))
    .call(gg => gg.select(".domain").remove());
}

// ========================================
// SECTION X: STANDARDIZED HOUR OF DAY HEATMAP
// Calls per 100,000 residents
// ========================================

function drawHourHeatmap(data2020, data2025, populationData) {

  const parseTime = d3.timeParse("%Y %b %d %I:%M:%S %p");

  const pop2020 = +populationData.find(d => +d.Year === 2020).Population;
  const pop2025 = +populationData.find(d => +d.Year === 2025).Population;

  function getHourRates(data, year, population) {
    const counts = new Array(24).fill(0);

    data.forEach(d => {
      const parsed = parseTime(d["CAD Event Arrived Time"]);

      if (parsed) {
        counts[parsed.getHours()]++;
      }
    });

    return counts.map((count, hour) => ({
      year,
      hour,
      count,
      rate: (count / population) * 100000
    }));
  }

  const heatData = [
    ...getHourRates(data2020, "2020", pop2020),
    ...getHourRates(data2025, "2025", pop2025)
  ];

  const margin = {
    top: 40,
    right: 20,
    bottom: 50,
    left: 80
  };

  const width = 950 - margin.left - margin.right;
  const height = 180 - margin.top - margin.bottom;

  const svg = d3.select("#hour-heatmap")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const chart = svg.append("g")
    .attr(
      "transform",
      `translate(${margin.left},${margin.top})`
    );

  const hours = d3.range(24);

  const x = d3.scaleBand()
    .domain(hours)
    .range([0, width])
    .padding(0.05);

  const y = d3.scaleBand()
    .domain(["2020", "2025"])
    .range([0, height])
    .padding(0.05);

  // MAX COUNT FOR EACH PRIORITY
  const color = d3.scaleSequential()
  .domain([
    0,
    d3.max(heatData, d => d.rate)
  ])
  .interpolator(d3.interpolatePurples);

  chart.selectAll(".heat-cell")
    .data(heatData)
    .enter()
    .append("rect")
    .attr("class", "heat-cell")
    .attr("x", d => x(d.hour))
    .attr("y", d => y(d.year))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.rate))
    .on("mouseover", (event, d) =>
      showTip(
        `<strong>${d.year}</strong><br>
        Hour: ${formatHour(d.hour)}<br>
        Raw calls: ${d3.format(",")(d.count)}<br>
        Rate: ${d.rate.toFixed(1)} calls per 100,000 residents`,
        event
      )
    )
    .on("mousemove", (event, d) =>
      showTip(
        `<strong>${d.year}</strong><br>
        Hour: ${formatHour(d.hour)}<br>
        Raw calls: ${d3.format(",")(d.count)}<br>
        Rate: ${d.rate.toFixed(1)} calls per 100,000 residents`,
        event
      )
    )
    .on("mouseout", hideTip);

  chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3.axisBottom(x)
        .tickFormat(d => formatHour(d))
    );

  chart.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y));

  chart.append("text")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .attr("class", "annotation")
    .text("Calls per 100,000 residents by hour of day");
}


// ========================================
// HELPER: FORMAT HOURS
// ========================================

function formatHour(hour) {
  if (hour === 0) return "12AM";
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return "12PM";
  return `${hour - 12}PM`;
}

// ========================================
// CHART X — STANDARDIZED PRIORITY RATES
// Calls per 100,000 residents
// ========================================

function drawPriorityRateChart(data2020, data2025, populationData) {
  const pop2020 = +populationData.find(d => +d.Year === 2020).Population;
  const pop2025 = +populationData.find(d => +d.Year === 2025).Population;

  function priorityCounts(data) {
    return d3.rollup(
      data.filter(d => d["Priority"] && d["Priority"].trim() !== ""),
      v => v.length,
      d => d["Priority"].trim()
    );
  }

  const c2020 = priorityCounts(data2020);
  const c2025 = priorityCounts(data2025);

  const priorityOrder = ["1", "2", "3", "4", "5"];

  const priorityData = priorityOrder.map(priority => ({
    priority: `Priority ${priority}`,
    rate2020: ((c2020.get(priority) || 0) / pop2020) * 100000,
    rate2025: ((c2025.get(priority) || 0) / pop2025) * 100000
  }));

  const margin = { top: 24, right: 40, bottom: 52, left: 90 };
  const width = 740 - margin.left - margin.right;
  const height = 380 - margin.top - margin.bottom;

  const svg = d3.select("#priority-rate-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand()
    .domain(priorityData.map(d => d.priority))
    .range([0, width])
    .padding(0.28);

  const x1 = d3.scaleBand()
    .domain(["2020", "2025"])
    .range([0, x0.bandwidth()])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([
      0,
      d3.max(priorityData, d => Math.max(d.rate2020, d.rate2025)) * 1.12
    ])
    .range([height, 0]);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
    .call(gg => gg.select(".domain").remove());

  const groups = g.selectAll(".priority-rate-group")
    .data(priorityData)
    .join("g")
    .attr("transform", d => `translate(${x0(d.priority)},0)`);

  groups.selectAll("rect")
    .data(d => [
      { year: "2020", rate: d.rate2020, priority: d.priority },
      { year: "2025", rate: d.rate2025, priority: d.priority }
    ])
    .join("rect")
    .attr("x", d => x1(d.year))
    .attr("y", d => y(d.rate))
    .attr("width", x1.bandwidth())
    .attr("height", d => height - y(d.rate))
    .attr("fill", d => d.year === "2020" ? UW_GOLD : UW_PURPLE)
    .on("mouseover", (event, d) =>
      showTip(
        `<strong>${d.priority} — ${d.year}</strong><br>${d.rate.toFixed(1)} calls per 100,000 residents`,
        event
      )
    )
    .on("mousemove", (event, d) =>
      showTip(
        `<strong>${d.priority} — ${d.year}</strong><br>${d.rate.toFixed(1)} calls per 100,000 residents`,
        event
      )
    )
    .on("mouseout", hideTip);

  groups.selectAll(".priority-rate-label")
    .data(d => [
      { year: "2020", rate: d.rate2020 },
      { year: "2025", rate: d.rate2025 }
    ])
    .join("text")
    .attr("class", "label")
    .attr("x", d => x1(d.year) + x1.bandwidth() / 2)
    .attr("y", d => y(d.rate) - 5)
    .attr("text-anchor", "middle")
    .text(d => d.rate.toFixed(1));

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .call(gg => gg.select(".domain").remove());

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d.toFixed(0)))
    .call(gg => gg.select(".domain").remove());
}
// ========================================
// CHART X — EVENT GROUP × PRIORITY HEATMAP
// Each priority uses its own gradient
// Hover shows count + percentage within priority
// ========================================

function drawEventPriorityHeatmap(data2025) {

  const cleanData = data2025.filter(d =>
    d["Event Group"] &&
    d["Event Group"].trim() !== "" &&
    d["Priority"] &&
    d["Priority"].trim() !== ""
  );

  const topEventGroups = Array.from(
    d3.rollup(
      cleanData,
      v => v.length,
      d => d["Event Group"].trim()
    ),
    ([eventGroup, count]) => ({
      eventGroup,
      count
    })
  )
  .sort((a, b) => b.count - a.count)
  .slice(0, 10)
  .map(d => d.eventGroup);

  const priorityOrder = ["1", "2", "3", "4", "5"];

  const priorityTotals = {};
  priorityOrder.forEach(priority => {
    priorityTotals[priority] = cleanData.filter(d =>
      d["Priority"].trim() === priority
    ).length;
  });

  const heatData = [];

  topEventGroups.forEach(eventGroup => {
    priorityOrder.forEach(priority => {

      const count = cleanData.filter(d =>
        d["Event Group"].trim() === eventGroup &&
        d["Priority"].trim() === priority
      ).length;

      const percent = priorityTotals[priority] > 0
        ? (count / priorityTotals[priority]) * 100
        : 0;

      heatData.push({
        eventGroup,
        priority: `Priority ${priority}`,
        priorityNumber: priority,
        count,
        percent
      });

    });
  });

  const priorityMax = {};

  priorityOrder.forEach(priority => {
    priorityMax[priority] = d3.max(
      heatData.filter(d => d.priorityNumber === priority),
      d => d.count
    );
  });

  const margin = { top: 40, right: 30, bottom: 60, left: 230 };
  const width = 850 - margin.left - margin.right;
  const height = 520 - margin.top - margin.bottom;

  const svg = d3.select("#event-priority-heatmap")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(priorityOrder.map(d => `Priority ${d}`))
    .range([0, width])
    .padding(0.05);

  const y = d3.scaleBand()
    .domain(topEventGroups)
    .range([0, height])
    .padding(0.05);

  chart.selectAll(".event-priority-cell")
    .data(heatData)
    .join("rect")
    .attr("class", "event-priority-cell")
    .attr("x", d => x(d.priority))
    .attr("y", d => y(d.eventGroup))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => {
      const scale = d3.scaleSequential()
        .domain([0, priorityMax[d.priorityNumber]])
        .interpolator(d3.interpolatePurples);

      return scale(d.count);
    })
    .on("mouseover", (event, d) =>
      showTip(
        `<strong>${d.eventGroup}</strong><br>
        ${d.priority}<br>
        ${d3.format(",")(d.count)} calls<br>
        ${d.percent.toFixed(1)}% of all ${d.priority} calls`,
        event
      )
    )
    .on("mousemove", (event, d) =>
      showTip(
        `<strong>${d.eventGroup}</strong><br>
        ${d.priority}<br>
        ${d3.format(",")(d.count)} calls<br>
        ${d.percent.toFixed(1)}% of all ${d.priority} calls`,
        event
      )
    )
    .on("mouseout", hideTip);

  chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .call(g => g.select(".domain").remove());

  chart.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .call(g => g.select(".domain").remove());

  chart.append("text")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .attr("class", "annotation")
    .text("2025 event groups by priority level");
}