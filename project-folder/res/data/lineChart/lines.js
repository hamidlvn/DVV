$( '#SelectState' ).select2( {
    // theme: "bootstrap-5"
} );

$( '#SelectYear' ).select2( {
    theme: "bootstrap-5",
    maximumSelectionLength: 10,
    closeOnSelect: false,
} );
fetch("state.json")
            .then(response => response.json())
            .then(data => {
                const citySelect = document.getElementById('SelectState');
                Object.entries(data).forEach(([key, value]) => {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = value;
                    citySelect.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching data:', error));


const yearSelect = document.getElementById('SelectYear');
var year = new Date().getFullYear() ;
for(var i=1895 ;i< year+1; i++){
    const option = document.createElement('option');
    option.value = i; 
    option.textContent = i; 
    yearSelect.appendChild(option);
    
};



function PlotLineClicked () {
    stateValue = $("#SelectState").val();
    yearValues = $("#SelectYear").val();
    if( yearValues.length == 0 || stateValue == null){
        return triggerAlert('liveAlertPlaceholder');
    }
    createVisualization(stateValue, yearValues);

}
function triggerAlert(PlaceHolderId){
    alertMessage('Please check if you have selected the options from dropdowns!', 'danger',PlaceHolderId);
}

function alertMessage(message, type, PlaceHolderId) {
    var alertPlaceholder = document.getElementById(PlaceHolderId)
    var wrapper = document.createElement('div')
    wrapper.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible d-flex align-items-center" role="alert"> <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Danger:"><use xlink:href="#exclamation-triangle-fill"/></svg>' + message + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div></div>'
  
    alertPlaceholder.append(wrapper)
}



// Function to load CSV data
function loadTemperatureData(filePath) {
    return d3.csv(filePath, function(d) {
        return {
            state: d.state,
            date: d3.timeParse("%Y-%m")(d.year),
            value: +d.value // Convert value to a number
        };
    });
}

// Function to filter data by state and selected years
function filterDataBySelectedYears(data, state, selectedYears) {
    return data.filter(function(d) {
        return d.state === state &&
            selectedYears.includes(d.date.getFullYear().toString());
    });
}

// Function for creating the visualization
function createVisualization(selectedState, selectedYears) {
    const minTemperatureFile = "minData.csv";
    const maxTemperatureFile = "maxData.csv";
    const avgTemperatureFile = "avgData.csv";

    // Load data for minimum, maximum, and average temperatures
    Promise.all([
        loadTemperatureData(minTemperatureFile),
        loadTemperatureData(maxTemperatureFile),
        loadTemperatureData(avgTemperatureFile)
    ]).then(function(data) {
        const minTempData = data[0];
        const maxTempData = data[1];
        const avgTempData = data[2];

        // Filter data by state and selected years
        const filteredMinTempData = filterDataBySelectedYears(minTempData, selectedState, selectedYears);
        const filteredMaxTempData = filterDataBySelectedYears(maxTempData, selectedState, selectedYears);
        const filteredAvgTempData = filterDataBySelectedYears(avgTempData, selectedState, selectedYears);

        // Merge the three filtered datasets or use them separately for visualization
        const mergedData = filteredAvgTempData.map(function(d, i) {
            return {
                date: d.date,
                minTemp: filteredMinTempData[i].value,
                maxTemp: filteredMaxTempData[i].value,
                avgTemp: d.value
            };
        });

        // Set up dimensions and margins for the chart
        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        const width = 1000 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        // Create SVG element
        d3.select("#LineChartContainer").select("svg").remove();
        const svg = d3.select("#LineChartContainer")
            .append("svg")
            .attr("width", width  + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Set up scales
       
        const xScale = d3.scaleTime()
            .domain(d3.extent(mergedData, function(d) { return d.date; }))
            .range([ 0, width -200 ]);
            xAxis = svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale));

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(mergedData, function(d) { return  Math.max(d.minTemp, d.maxTemp, d.avgTemp) })])
            .range([ height, 0 ]);
            yAxis = svg.append("g")
            .call(d3.axisLeft(yScale));
            svg.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left+20)
            .attr("x", -margin.top)
            .text("Temperature")

        //Add a clipPath: everything out of this area won't be drawn.
        const clip = svg.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", width -200)
            .attr("height", height )
            .attr("x", 0)
            .attr("y", 0);

        //Add brushing
        const brush = d3.brushX()                   // Add the brush feature using the d3.brush function
          .extent( [ [0,0], [width-200,height] ] )  // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
          .on("end", updateChart)


        const lineMin = svg.append('g')
            .attr("clip-path", "url(#clip)")

        const lineMax = svg.append('g')
            .attr("clip-path", "url(#clip)")
        

        // Add the line
        lineMin.append("path")
            .datum(mergedData)
            .attr("class", "line")  // I add the class line to be able to modify this line later on.
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
            .x(function(d) { return xScale(d.date) })
            .y(function(d) { return yScale(d.minTemp) })
            )
    
        // Add the brushing
        lineMax
            .append("g")
            .attr("class", "brush")
            .call(brush)
        
        lineMax.append("path")
            .datum(mergedData)
            .attr("class", "line")  // I add the class line to be able to modify this line later on.
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
            .x(function(d) { return xScale(d.date) })
            .y(function(d) { return yScale(d.maxTemp) })
        )
    
        // Add the brushing
        lineMax
            .append("g")
            .attr("class", "brush")
            .call(brush)

        
        // Draw dots for average temperature
        svg.selectAll("dot")
            .data(mergedData)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => yScale(d.avgTemp))
            .attr("r", 3)
            .style("fill", "green");

        svg.selectAll("dot").append("g")
        .attr("class", "brush")
        .call(brush)
        
        // Add X and Y axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .call(d3.axisLeft(yScale));

           
            svg.append("circle").attr("cx",width -110 ).attr("cy",20).attr("r", 6).style("fill", "red")
            svg.append("text").attr("x", width -95).attr("y", 20).text("Maximum Temp").style("font-size", "15px").attr("alignment-baseline","middle")
            svg.append("circle").attr("cx",width -110 ).attr("cy",50).attr("r", 6).style("fill", "green")
            svg.append("text").attr("x", width -95).attr("y", 50).text("Average Temp").style("font-size", "15px").attr("alignment-baseline","middle")
            svg.append("circle").attr("cx",width -110 ).attr("cy",80).attr("r", 6).style("fill", "blue")
            svg.append("text").attr("x", width -95).attr("y", 80).text("Minimum Temp").style("font-size", "15px").attr("alignment-baseline","middle")
            
        

    // A function that set idleTimeOut to null
      let idleTimeout
      function idled() { idleTimeout = null; }
  
      // A function that update the chart for given boundaries
      function updateChart(event,d) {
  
        // What are the selected boundaries?
        extent = event.selection
  
        // If no selection, back to initial coordinate. Otherwise, update X axis domain
        if(!extent){
          if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
          //xScale.domain(d3.extent(mergedData, function(d) { return d.date; }))
        }else{
          xScale.domain([ xScale.invert(extent[0]), xScale.invert(extent[1]) ])
          svg.selectAll(".brush").call(brush.move, null);
        }
  
        // Update axis and line position
        xAxis.transition().duration(1000).call(d3.axisBottom(xScale));
        lineMin
            .select('.line')
            .transition()
            .duration(1000)
            .attr("d", d3.line()
                .x(function(d) { return xScale(d.date) })
                .y(function(d) { return yScale(d.minTemp) })
            )
        lineMax
            .select('.line')
            .transition()
            .duration(1000)
            .attr("d", d3.line()
                .x(function(d) { return xScale(d.date) })
                .y(function(d) { return yScale(d.maxTemp) })
            )
        svg.selectAll(".dot")
            .transition()
            .duration(1000)
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => yScale(d.avgTemp))
      }
      
  
      // If user double click, reinitialize the chart
      svg.on("dblclick",function(){
        xScale.domain(d3.extent(mergedData, function(d) { return d.date; }))
        xAxis.transition().call(d3.axisBottom(xScale))
        lineMin
          .select('.line')
          .transition()
          .attr("d", d3.line()
            .x(function(d) { return xScale(d.date) })
            .y(function(d) { return yScale(d.minTemp) })
        )
        lineMax
          .select('.line')
          .transition()
          .attr("d", d3.line()
            .x(function(d) { return xScale(d.date) })
            .y(function(d) { return yScale(d.maxTemp) })
        )
        svg.selectAll(".dot")
            .transition()
            .duration(1000)
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => yScale(d.avgTemp))
      });

    });
}