const margin = { top: 50, right: 40, bottom: 180, left: 90 };
const width = 980 - margin.left - margin.right;
const height = 630 - margin.top - margin.bottom;

const ageColors = {
    "<30": "#f28b82",
    "30 - 40": "#fbbc04",
    "40 - 50": "#81c995",
    "50 - 60": "#8ab4f8",
    "60 +": "#c58af9"
};

const ageHoverColors = {
    "<30": "#d93025",
    "30 - 40": "#f29900",
    "40 - 50": "#188038",
    "50 - 60": "#1a73e8",
    "60 +": "#9334e6"
};

const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

const chart = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const xScale = d3.scaleBand()
    .range([0, width])
    .padding(0.28);

const yScale = d3.scaleLinear()
    .range([height, 0]);

const xAxis = chart.append("g")
    .attr("transform", `translate(0, ${height})`);

const yAxis = chart.append("g");

const yGrid = chart.append("g")
    .attr("class", "grid");

chart.append("text")
    .attr("class", "axis-label")
    .attr("x", -height / 2)
    .attr("y", -62)
    .attr("transform", "rotate(-90)")
    .text("Average hourly wage (USD)");

const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

let wageData;
let selectedAge = "<30";

d3.csv("AgeGenderWage.csv").then(data => {

    data.forEach(d => {
        d["<30"] = cleanMoney(d["<30"]);
        d["30 - 40"] = cleanMoney(d["30 - 40"]);
        d["40 - 50"] = cleanMoney(d["40 - 50"]);
        d["50 - 60"] = cleanMoney(d["50 - 60"]);
        d["60 +"] = cleanMoney(d["60 +"]);
    });

    wageData = data;

    updateChart();

    d3.select("#ageSelect").on("change", function () {
        selectedAge = this.value;
        updateChart();
    });

    d3.select("#sortCheck").on("change", function () {
        updateChart();
    });
});

function updateChart() {
    const shouldSort = d3.select("#sortCheck").property("checked");

    let displayedData = wageData.map(d => ({
        department: d["Department (>100 employees)"],
        wage: d[selectedAge]
    }));

    if (shouldSort) {
        displayedData.sort((a, b) => b.wage - a.wage);
    }

    xScale.domain(displayedData.map(d => d.department));
    yScale.domain([0, d3.max(displayedData, d => d.wage) + 10]);

    yGrid
        .transition()
        .duration(800)
        .call(
            d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat("")
        );

    const bars = chart.selectAll(".bar")
        .data(displayedData, d => d.department);

    bars.join(
        enter => enter.append("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.department))
            .attr("width", xScale.bandwidth())
            .attr("y", height)
            .attr("height", 0)
            .attr("fill", ageColors[selectedAge])
            .call(enter => enter.transition()
                .duration(800)
                .attr("y", d => yScale(d.wage))
                .attr("height", d => height - yScale(d.wage))
            ),

        update => update.call(update => update.transition()
            .duration(800)
            .attr("x", d => xScale(d.department))
            .attr("width", xScale.bandwidth())
            .attr("y", d => yScale(d.wage))
            .attr("height", d => height - yScale(d.wage))
            .attr("fill", ageColors[selectedAge])
        )
    )
    .on("mousemove", function (event, d) {
        d3.select(this).attr("fill", ageHoverColors[selectedAge]);

        tooltip
            .style("opacity", 1)
            .html(`<strong>${d.department}</strong><br>$${d.wage.toFixed(2)} per hour`)
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 35 + "px");
    })
    .on("mouseleave", function () {
        d3.select(this).attr("fill", ageColors[selectedAge]);
        tooltip.style("opacity", 0);
    });

    chart.selectAll(".bar-label")
        .data(displayedData, d => d.department)
        .join("text")
        .attr("class", "bar-label")
        .transition()
        .duration(800)
        .attr("x", d => xScale(d.department) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.wage) - 8)
        .attr("text-anchor", "middle")
        .text(d => `$${d.wage.toFixed(2)}`)
        .attr("fill", ageHoverColors[selectedAge]);

    xAxis
        .transition()
        .duration(800)
        .call(d3.axisBottom(xScale));

    xAxis.selectAll("text")
        .attr("transform", "rotate(-35)")
        .attr("dx", "-0.6em")
        .attr("dy", "0.6em")
        .style("text-anchor", "end")
        .call(wrapText, 95);

    yAxis
        .transition()
        .duration(800)
        .call(d3.axisLeft(yScale).tickFormat(d => `$${d}`));

    chart.selectAll(".chart-note").remove();

    chart.append("text")
        .attr("class", "chart-note")
        .attr("x", 0)
        .attr("y", -20)
        .attr("fill", ageHoverColors[selectedAge])
        .text(`Showing average hourly wage for age group: ${selectedAge}`);
}

function cleanMoney(value) {
    return +value.replace("$", "");
}

function wrapText(text, width) {
    text.each(function () {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();

        let word;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.1;

        const y = text.attr("y");
        const x = text.attr("x");
        const dy = parseFloat(text.attr("dy"));

        text.text(null);

        let tspan = text.append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));

                line = [word];

                tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                    .text(word);
            }
        }
    });
}