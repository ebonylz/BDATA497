function cleanMoney(value) {
    return +value.replace("$", "");
}

function makeDumbbellChart(csvFile, chartDiv, categoryColumn, chartTitle) {

    const margin = {
        top: 70,
        right: 140,
        bottom: 60,
        left: 280
    };

    const width = 1050 - margin.left - margin.right;
    const height = 520 - margin.top - margin.bottom;

    const svg = d3.select(chartDiv)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip");

    d3.csv(csvFile).then(data => {

        data.forEach(d => {
            d.Male = cleanMoney(d.Male);
            d.Female = cleanMoney(d.Female);
            d.Difference = cleanMoney(d.Difference);
        });

        data.sort((a, b) => b.Difference - a.Difference);

        const x = d3.scaleLinear()
            .domain([
                d3.min(data, d => Math.min(d.Male, d.Female)) - 5,
                d3.max(data, d => Math.max(d.Male, d.Female)) + 5
            ])
            .range([0, width]);

        const y = d3.scaleBand()
            .domain(data.map(d => d[categoryColumn]))
            .range([0, height])
            .padding(0.5);

        svg.append("text")
            .attr("x", margin.left)
            .attr("y", 30)
            .attr("class", "chart-title")
            .text(chartTitle);

        chart.append("g")
            .attr("class", "grid")
            .call(
                d3.axisBottom(x)
                    .tickSize(height)
                    .tickFormat("")
            );

        chart.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y));

        chart.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d => `$${d}`));

        chart.selectAll(".connection")
            .data(data)
            .enter()
            .append("line")
            .attr("class", "connection")
            .attr("x1", d => x(d.Female))
            .attr("x2", d => x(d.Male))
            .attr("y1", d => y(d[categoryColumn]) + y.bandwidth() / 2)
            .attr("y2", d => y(d[categoryColumn]) + y.bandwidth() / 2);

        chart.selectAll(".female")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "female")
            .attr("cx", d => x(d.Female))
            .attr("cy", d => y(d[categoryColumn]) + y.bandwidth() / 2)
            .attr("r", 8)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 11);

                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${d[categoryColumn]}</strong><br>
                        Female Wage: $${d.Female.toFixed(2)}
                    `);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 8);

                tooltip.style("opacity", 0);
            });

        chart.selectAll(".male")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "male")
            .attr("cx", d => x(d.Male))
            .attr("cy", d => y(d[categoryColumn]) + y.bandwidth() / 2)
            .attr("r", 8)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 11);

                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${d[categoryColumn]}</strong><br>
                        Male Wage: $${d.Male.toFixed(2)}
                    `);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 8);

                tooltip.style("opacity", 0);
            });

        chart.selectAll(".diff")
            .data(data)
            .enter()
            .append("text")
            .attr("x", d => x(Math.max(d.Male, d.Female)) + 15)
            .attr("y", d => y(d[categoryColumn]) + y.bandwidth() / 2 + 5)
            .attr("class", "label")
            .text(d => `Gap: $${d.Difference.toFixed(2)}`);

        const legend = svg.append("g")
            .attr("transform", `translate(${width + margin.left + 25},70)`);

        legend.append("circle")
            .attr("r", 8)
            .attr("class", "male");

        legend.append("text")
            .attr("x", 15)
            .attr("y", 5)
            .text("Male");

        legend.append("circle")
            .attr("r", 8)
            .attr("cy", 30)
            .attr("class", "female");

        legend.append("text")
            .attr("x", 15)
            .attr("y", 35)
            .text("Female");
    });
}

makeDumbbellChart(
    "RaceVGender.csv",
    "#chart",
    "Race",
    "Average Wage by Race and Gender"
);