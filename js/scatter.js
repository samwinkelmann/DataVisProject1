// Scatterplot: life expectancy (y) vs energy consumption (x)
// Uses the same data as histogram.js (lifeData) and continent color scale

const S_MARGIN = { top: 30, right: 30, bottom: 60, left: 60 };
const S_WIDTH = 800 - S_MARGIN.left - S_MARGIN.right;
const S_HEIGHT = 500 - S_MARGIN.top - S_MARGIN.bottom;

let svgScatter, svgGroupScatter, xScaleScatter, yScaleScatter;
let xAxisSG, yAxisSG, xAxisScatter, yAxisScatter, tooltipScatter;
let globalEnergyDomain, globalLifeDomain;
let brushScatter;

function initScatter() {
  svgScatter = d3.select('#scatter')
    .attr('width', S_WIDTH + S_MARGIN.left + S_MARGIN.right)
    .attr('height', S_HEIGHT + S_MARGIN.top + S_MARGIN.bottom)
    .attr('viewBox', `0 0 ${S_WIDTH + S_MARGIN.left + S_MARGIN.right} ${S_HEIGHT + S_MARGIN.top + S_MARGIN.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  svgGroupScatter = svgScatter.append('g')
    .attr('transform', `translate(${S_MARGIN.left},${S_MARGIN.top})`);

  xScaleScatter = d3.scaleLinear().range([0, S_WIDTH]);
  yScaleScatter = d3.scaleLinear().range([S_HEIGHT, 0]);

  xAxisSG = svgGroupScatter.append('g')
    .attr('transform', `translate(0,${S_HEIGHT})`)
    .attr('class', 'x-axis');

  yAxisSG = svgGroupScatter.append('g')
    .attr('class', 'y-axis');

  svgGroupScatter.append('text')
    .attr('class', 'axis-label')
    .attr('x', S_WIDTH / 2)
    .attr('y', S_HEIGHT + 45)
    .attr('text-anchor', 'middle')
    .text('Energy Consumption (per-capita)');

  svgGroupScatter.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(S_HEIGHT / 2))
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .text('Life Expectancy (years)');

  svgGroupScatter.append('text')
    .attr('class', 'title')
    .attr('x', S_WIDTH / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .text('Life Expectancy vs Energy Consumption by Country');

  tooltipScatter = d3.select('#tooltip');

  // Add brushing for scatter selection
  brushScatter = d3.brush()
    .extent([[0, 0], [S_WIDTH, S_HEIGHT]])
    .on('end', scatterBrushEnded);

  svgGroupScatter.append('g')
    .attr('class', 'brush scatter-brush')
    .call(brushScatter);
}

function updateScatter(year) {
  if (!svgScatter) initScatter();

  // Filter data for the selected year and remove rows with missing energy or life expectancy
  const points = lifeData.filter(d => 
    d.year === +year && 
    !isNaN(d.life_expectancy) && 
    !isNaN(d.energy_consumption) &&
    (typeof window.selectedContinents === 'undefined' || window.selectedContinents.has(d.continent))
  );

  // Keep all points visible; selection highlighting is applied after drawing
  const filteredPoints = points;

  svgGroupScatter.selectAll('text.no-data').remove();
  if (points.length === 0) {
    svgGroupScatter.selectAll('circle.point').remove();
    svgGroupScatter.append('text')
      .attr('class', 'no-data')
      .attr('x', S_WIDTH / 2)
      .attr('y', S_HEIGHT / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .text('No data for selected year');
    return;
  }

  // Set domains (based on visible points)
  xScaleScatter.domain([0, d3.max(filteredPoints, d => d.energy_consumption) || 100]);
  yScaleScatter.domain([0, d3.max(filteredPoints, d => d.life_expectancy) || 100]);

  xAxisScatter = d3.axisBottom(xScaleScatter).ticks(8);
  yAxisScatter = d3.axisLeft(yScaleScatter).ticks(6);

  xAxisSG.transition().duration(250).call(xAxisScatter);
  yAxisSG.transition().duration(250).call(yAxisScatter);

  const circles = svgGroupScatter.selectAll('circle.point')
    .data(filteredPoints, d => d.country);

  // Exit
  circles.exit().transition().duration(200).attr('r', 0).remove();

  // Update
  circles.transition().duration(300)
    .attr('cx', d => xScaleScatter(d.energy_consumption))
    .attr('cy', d => yScaleScatter(d.life_expectancy));

  // Enter
  const enter = circles.enter().append('circle')
    .attr('class', 'point')
    .attr('cx', d => xScaleScatter(d.energy_consumption))
    .attr('cy', d => yScaleScatter(d.life_expectancy))
    .attr('r', 0)
    .attr('fill', d => continentColorScale(d.continent))
    .attr('opacity', 0.85)
    .attr('stroke', '#333')
    .attr('stroke-width', 0.5)
    .on('mouseover', (event, d) => {
      tooltipScatter.style('display', 'block')
        .html(`<div class="tooltip-title">${d.country}</div><div>${d.continent}</div><div>Life Expectancy: ${d.life_expectancy.toFixed(1)}</div><div>Energy: ${d.energy_consumption.toFixed(2)}</div>`);
    })
    .on('mousemove', (event) => {
      tooltipScatter.style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY + 10) + 'px');
    })
    .on('mouseout', () => tooltipScatter.style('display', 'none'));

  enter.transition().duration(300).attr('r', 5);
  // Apply selection highlighting (if any)
  if (typeof updateSelectionStyles === 'function') updateSelectionStyles();
}

function scatterBrushEnded({selection}) {
  if (!selection) {
    // cleared
    if (typeof clearCountrySelection === 'function') clearCountrySelection();
    return;
  }
  const [[x0, y0], [x1, y1]] = selection;
  const selected = new Set();
  svgGroupScatter.selectAll('circle.point').each(function(d) {
    const node = d3.select(this);
    const cx = +node.attr('cx');
    const cy = +node.attr('cy');
    if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) selected.add(d.country);
  });
  if (typeof applyCountrySelection === 'function') applyCountrySelection(selected);
}

// Initialize when histogram data is ready
// Wait for lifeData to be populated by histogram.js
function initScatterWhenReady() {
  if (typeof lifeData !== 'undefined' && Array.isArray(lifeData) && lifeData.length > 0) {
    // Compute global domains
    globalLifeDomain = d3.extent(lifeData.filter(d => !isNaN(d.life_expectancy)), d => d.life_expectancy);
    globalEnergyDomain = d3.extent(lifeData.filter(d => !isNaN(d.energy_consumption)), d => d.energy_consumption);

    initScatter();
    const slider = document.getElementById('yearSlider');
    const year = slider ? +slider.value : d3.max(lifeData, d => d.year);
    updateScatter(year);

    // Listen to slider changes
    if (slider) {
      slider.addEventListener('input', (e) => updateScatter(+e.target.value));
    }
  } else {
    // Wait a bit and try again
    setTimeout(initScatterWhenReady, 100);
  }
}

// Start initialization when DOM is ready
window.addEventListener('load', initScatterWhenReady);
