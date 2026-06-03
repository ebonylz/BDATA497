//Consts/global variables  
            const w = 500;
            const h = 500;
            const margin = 30;
            
//Data

            /* If your data is in multiple CSVs you could load them
            in with Promise.all. Below is one example. If your data is all
            in one CSV you can just load it in per usual*/ 

            Promise.all([
            d3.csv("emails.csv"), // files[0] will contain emails.csv
            d3.csv("stars.csv"),  // files[1] will contain stars.csv
            ]).then(function(files) {
            // remember to put + when the field has #s in it
            const data = {
                "bar": files[0].map(d => { return {"day": d.day, "emails": +d.emails}}),
                "scatter": files[1].map(d => { return {"item": d.item, "x": +d.x, "y": +d.y}})
            };
            console.log("two datasets", data)
            
            /* Note: we will use data.bar or data.scatter below to
            reference the dataset we want*/
        
//Chart 1 - Bar chart
            
            //scales
            const maxY = d3.max(data.bar, d => d.emails);

            const xScale = d3.scaleBand()
                            .domain(data.bar.map(d => d.day))
                            .range([margin, w - margin])
                            .paddingInner(.02);
            
            const yScale = d3.scaleLinear()
                            .domain([0, maxY]) 
                            .range([h - margin, margin]);
            
            //axes
            const bottomAxis = d3.axisBottom().scale(xScale);
            const leftAxis = d3.axisLeft().scale(yScale);


            //Select SVG 1  
            const svg1 = d3.select("#svg1")//to call an id be sure to use #
                    .append("svg")
                    .attr("width", w)
                    .attr("height", h);

            //Bars
            svg1.selectAll("rect") 
                .data(data.bar) 
                .enter()
                .append("rect")
                .attr("x", d => xScale(d.day)) 
                .attr("y", d => yScale(d.emails)) 
                .attr("width", xScale.bandwidth()) 
                .attr("height", d => (h-margin) - yScale(d.emails))
                .attr("fill", "pink");

            //call SVG1 axes
            svg1.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(0," + (h - margin) + ")") 
                .call(bottomAxis); 

            svg1.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(" + margin + ",0)")
                .call(leftAxis); 


//Chart 2 - Scatter plot
                  
            //scales
            const maxX2 = d3.max(data.scatter, d => d.x);
            const maxY2 = d3.max(data.scatter, d => d.y);

            const newXScale = d3.scaleLinear()
                             .domain([0, maxX2]) 
                             .range([margin, w-margin]); 

            const newYScale = d3.scaleLinear()
                             .domain([0, maxY2]) 
                             .range([h-margin, margin]); 


            //axes
            const bottomAxis2 = d3.axisBottom()
                                .scale(newXScale)
                                .ticks(10);

            const leftAxis2 = d3.axisLeft()
                             .scale(newYScale)
                             .ticks(10);                

            
            //Select SVG 2 
            const svg2 = d3.select("#svg2")//to call an id be sure to use #
                    .append("svg")
                    .attr("width", w)
                    .attr("height", h);

            //Circles 
            svg2.selectAll("circle") 
                .data(data.scatter) 
                .enter()
                .append("circle") 
                .attr("cx", d => newXScale(d.x)) 
                .attr("cy", d => newYScale(d.y)) 
                .attr("r", 6) 
                .attr("fill", "pink"); 

            //call SVG2 axes
            svg2.append("g")
                .attr("class", "axis") 
                .attr("transform", "translate(0," + (h - margin) + ")") 
                .call(bottomAxis2); 

             svg2.append("g")
                 .attr("class", "axis") 
                 .attr("transform", "translate(" + margin + ",0)") 
                 .call(leftAxis2); 
        })