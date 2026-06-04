const w = 1400;
const h = 600;
const margin = 90;
const rightMargin = 300;

//Load data
d3.csv("AgeGenderWage.csv").then(data => {

    console.log("data", data);

    //Age categories
    const ageGroups = ["<30", "30 - 40", "40 - 50", "50 - 60", "60 +"];

    //Format data
    //Format data
    data.forEach(d => {
        ageGroups.forEach(age => {
            d[age] = +d[age].replace("$", "");
        });
    });

    //Sort departments by 60+ wage descending
    data.sort((a, b) => b["60 +"] - a["60 +"]);

    //X scale
    const xScale = d3.scalePoint()
        .domain(ageGroups)
        .range([margin, w - rightMargin]);

    //Y scale
    const yScale = d3.scaleLinear()
        .domain([
            21,
            d3.max(data, d =>
                d3.max(ageGroups, age => d[age])
            )
        ])
        .range([h - margin, margin]);

    //Color scale
    const colorScale = d3.scaleSequential()
        .domain([0, data.length - 1])
        .interpolator(d3.interpolatePlasma);

    //Axes
    const bottomAxis = d3.axisBottom()
        .scale(xScale);

    const leftAxis = d3.axisLeft()
        .scale(yScale);

    //SVG
    const svg = d3.select("body")
        .append("svg")
        .attr("width", w)
        .attr("height", h);

    //Line generator
    const line = d3.line()
        .x(d => xScale(d.age))
        .y(d => yScale(d.value));
    //Horizontal grid lines
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(" + margin + ",0)")
        .call(
            d3.axisLeft(yScale)
                .tickSize(-(w - margin - rightMargin))
                .tickFormat("")
        );

    //Create one line per department
    data.forEach((d, i) => {

        const lineData = ageGroups.map(age => {
            return {
                age: age,
                value: d[age]
            };
        });

        svg.append("path")
            .data([lineData])
            .attr("d", line)
            .attr("class", "line")
            .attr("stroke", colorScale(i));

        //Department labels
        svg.append("text")
            .attr("x", w - rightMargin + 25)
            .attr("y", margin + i * 22)
            .attr("class", "label")
            .attr("fill", colorScale(i))
            .text(d["Department (>100 employees)"]);
    });

    //Bottom axis
    svg.append("g")
        .attr("class", "axis")
        .attr("transform",
            "translate(0," + (h - margin) + ")")
        .call(bottomAxis)
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end");

    //Left axis
    svg.append("g")
        .attr("class", "axis")
        .attr("transform",
            "translate(" + margin + ",0)")
        .call(leftAxis);

    //Title
    svg.append("text")
        .attr("class", "title")
        .attr("x", w / 2)
        .attr("y", 35)
        .attr("text-anchor", "middle")
        .text("Average Wage by Age Group and Department");

    //Clickable credit link
    const creditLink = svg.append("a")
        .attr("href",
            "https://data.seattle.gov/City-Administration/City-of-Seattle-Wage-Data/2khk-5ukd/about_data")
        .attr("target", "_blank");

    //"Made by" text
    creditLink.append("text")
        .attr("x", w / 2 - 120)
        .attr("y", h - 15)
        .attr("class", "credit")
        .text("Made by Ebony Lopez |");

    //Clickable source text
    creditLink.append("text")
        .attr("x", w / 2 + 20)
        .attr("y", h - 15)
        .attr("class", "creditLink")
        .text("Seattle Open Data Portal");

});