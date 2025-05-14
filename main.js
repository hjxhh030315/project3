const margin = { top: 20, right: 60, bottom: 40, left: 60 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("svg")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

let xScale, yAct, yTemp;
let allData = []; // global for brushing and tooltip use
let currentFiltered = []; // store currently displayed mouse's data

d3.csv("fem_combined.csv").then(data => {
    data.forEach(d => {
        d.minute = +d.minute;
        d.activity = +d.activity;
        d.temp = +d.temp;
    });

    allData = data;
    const mouseIDs = Array.from(new Set(data.map(d => d.mouse_id)));

    xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.minute))
        .range([0, width]);

    yTemp = d3.scaleLinear().domain([35, 39]).range([height, 0]);
    yAct = d3.scaleLinear().domain(d3.extent(data, d => d.activity)).range([height, 0]);

    // Axes
    svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale));
    svg.append("g").attr("class", "y-axis-act").call(d3.axisLeft(yAct));
    svg.append("g").attr("class", "y-axis-temp").attr("transform", `translate(${width},0)`).call(d3.axisRight(yTemp));

    // Dropdown
    d3.select("#mouseSelect")
        .selectAll("option")
        .data(mouseIDs)
        .enter()
        .append("option")
        .text(d => d);

    function update(selectedID) {
        currentFiltered = allData.filter(d => d.mouse_id === selectedID);
        svg.selectAll(".line").remove();
        svg.selectAll(".dot").remove();

        svg.append("path")
            .datum(currentFiltered)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("d", d3.line()
                .x(d => xScale(d.minute))
                .y(d => yAct(d.activity)));

        svg.append("path")
            .datum(currentFiltered)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "tomato")
            .attr("stroke-dasharray", "5 5")
            .attr("d", d3.line()
                .x(d => xScale(d.minute))
                .y(d => yTemp(d.temp)));

        // Add tooltip dots
        svg.selectAll(".dot")
            .data(currentFiltered)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => xScale(d.minute))
            .attr("cy", d => yAct(d.activity))
            .attr("r", 2)
            .attr("fill", "blue")
            .on("mouseover", (event, d) => {
                d3.select("#tooltip")
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 30) + "px")
                    .style("display", "inline-block")
                    .html(`Mouse: ${d.mouse_id}<br>Minute: ${d.minute}<br>Activity: ${d.activity}<br>Temp: ${d.temp}`);
            })
            .on("mouseout", () => d3.select("#tooltip").style("display", "none"));
    }

    update(mouseIDs[0]);

    d3.select("#mouseSelect").on("change", function() {
        update(this.value);
    });

    // Add estrus shading (after axes are set)
    const estrusPeriods = [1440, 7200, 12960, 18720];
    estrusPeriods.forEach(start => {
        svg.append("rect")
            .attr("class", "estrus-shade")
            .attr("x", xScale(start))
            .attr("y", 0)
            .attr("width", xScale(1440) - xScale(0))
            .attr("height", height)
            .attr("fill", "pink")
            .attr("opacity", 0.2);
    });

    // Add brushing
    const brush = d3.brushX()
        .extent([
            [0, 0],
            [width, height]
        ])
        .on("end", brushed);

    svg.append("g")
        .attr("class", "brush")
        .call(brush);

    function brushed(event) {
        const selection = event.selection;
        if (!selection) return;

        const [x0, x1] = selection.map(xScale.invert);

        xScale.domain([x0, x1]);

        svg.select(".x-axis").call(d3.axisBottom(xScale));

        // Redraw both lines and dots
        svg.selectAll(".line")
            .attr("d", d3.line()
                .x(d => xScale(d.minute))
                .y(d => d3.select(this).attr("stroke") === "steelblue" ? yAct(d.activity) : yTemp(d.temp)));

        svg.selectAll(".dot")
            .attr("cx", d => xScale(d.minute))
            .attr("cy", d => yAct(d.activity));
    }
});