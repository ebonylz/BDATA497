//Declare consts/global variables
const margin = 120;
const width = 1200; 
const height = 500;


//Load data and related variables
d3.csv("DepAvgWage.csv").then(data => {
    console.log("data", data)

    //format data
    data.forEach(d => { 
        d.department = d["Department (>100 employees)"];
        d.wage = +d["Average Wage"].replace("$", ""); 
    });
    
    const maxY = d3.max(data, d => d.wage);


//Scales - note: band and linear
    const xScale = d3.scaleBand()
                    .domain(data.map(d => d.department))
                    .range([margin, width - margin])
                    .paddingInner(.02);
    
    const yScale = d3.scaleLinear()
                    .domain([0, maxY]) 
                    .range([height - margin, margin]);
    

//SVG
    const svg = d3.select("body")
                .append("svg")
                .attr("width", width)
                .attr("height", height);

                
//Axes - create axes
    const bottomAxis = d3.axisBottom()
                            .scale(xScale);
    
    const leftAxis = d3.axisLeft()
                        .scale(yScale);
    

//Bars
//rect needs x, y, width, and height
    svg.selectAll("rect") 
        .data(data) 
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.department)) 
        .attr("y", d => yScale(d.wage)) 
        .attr("width", xScale.bandwidth())
        .attr("height", d => (height-margin) - yScale(d.wage))
        .attr("fill", "pink");
    

//Axes - call axes
    svg.append("g")
    .attr("transform", "translate(0," + (height - margin) + ")") 
    .call(bottomAxis)
    .selectAll("text")
    .attr("transform", "rotate(-60)")
    .style("text-anchor", "end")
    .style("font-size", "8px");

    svg.append("g")
        .attr("transform", "translate(" + margin + ",0)")
        .call(leftAxis); 

            
});