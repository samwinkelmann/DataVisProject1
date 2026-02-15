// Interactive histogram for life expectancy by year
// Loads full CSV once, then updates histogram when the year slider changes

const HIST_MARGIN = { top: 30, right: 30, bottom: 60, left: 60 };
const HIST_WIDTH = 800 - HIST_MARGIN.left - HIST_MARGIN.right;
const HIST_HEIGHT = 500 - HIST_MARGIN.top - HIST_MARGIN.bottom;

let lifeData = [];
let svgGroup, xScale, yScale, xAxisG, yAxisG, xAxis, yAxis, tooltip;
let globalDomain;
// Energy histogram variables
let svgGroupE, xScaleE, yScaleE, xAxisGE, yAxisGE, xAxisE, yAxisE, globalDomainEnergy;

function initHistogram() {
  // Prepare SVG and groups
  const svg = d3.select('#histogram')
    .attr('width', HIST_WIDTH + HIST_MARGIN.left + HIST_MARGIN.right)
    .attr('height', HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom)
    .attr('viewBox', `0 0 ${HIST_WIDTH + HIST_MARGIN.left + HIST_MARGIN.right} ${HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Make the life-expectancy SVG fill its container's visible width
  const histContainer = document.getElementById('histogram-container');
  if (histContainer) {
    const visibleWidth = histContainer.clientWidth || (HIST_WIDTH + HIST_MARGIN.left + HIST_MARGIN.right);
    d3.select('#histogram').style('width', visibleWidth + 'px');
  }

  svgGroup = svg.append('g')
    .attr('transform', `translate(${HIST_MARGIN.left},${HIST_MARGIN.top})`);

  // Scales (x domain set after data load)
  xScale = d3.scaleLinear().range([0, HIST_WIDTH]);
  yScale = d3.scaleLinear().range([HIST_HEIGHT, 0]);

  // Axis groups
  xAxisG = svgGroup.append('g')
    .attr('transform', `translate(0,${HIST_HEIGHT})`)
    .attr('class', 'x-axis');

  yAxisG = svgGroup.append('g')
    .attr('class', 'y-axis');

  // Axis labels
  svgGroup.append('text')
    .attr('class', 'axis-label')
    .attr('x', HIST_WIDTH / 2)
    .attr('y', HIST_HEIGHT + 45)
    .attr('text-anchor', 'middle')
    .text('Life Expectancy (years)');

  svgGroup.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(HIST_HEIGHT / 2))
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .text('Frequency');

  svgGroup.append('text')
    .attr('class', 'title')
    .attr('x', HIST_WIDTH / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .text('Distribution of Life Expectancy Across Countries and Years');

  // Tooltip
  tooltip = d3.select('#tooltip')
    .style('position', 'absolute')
    .style('display', 'none')
    .style('pointer-events', 'none');
}

function initEnergyHistogram() {
  const svg = d3.select('#histogram-energy')
    .attr('height', HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom)
    .attr('preserveAspectRatio', 'xMinYMid meet');

  // group for bars (positioned after svg width is set in update)
  svgGroupE = svg.append('g')
    .attr('transform', `translate(${HIST_MARGIN.left},${HIST_MARGIN.top})`);

  // band scale for countries; range will be set per-update to allow horizontal scrolling
  xScaleE = d3.scaleBand().padding(0.05).range([0, HIST_WIDTH]);
  yScaleE = d3.scaleLinear().range([HIST_HEIGHT, 0]);

  xAxisGE = svgGroupE.append('g')
    .attr('transform', `translate(0,${HIST_HEIGHT})`)
    .attr('class', 'x-axis');

  yAxisGE = svgGroupE.append('g')
    .attr('class', 'y-axis');

  svgGroupE.append('text')
    .attr('class', 'axis-label')
    .attr('x', HIST_WIDTH / 2)
    .attr('y', HIST_HEIGHT + 45)
    .attr('text-anchor', 'middle')
    .text('Country');

  svgGroupE.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(HIST_HEIGHT / 2))
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .text('Energy Consumption (per-capita)');

  svgGroupE.append('text')
    .attr('class', 'title')
    .attr('x', HIST_WIDTH / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .text('Per-Capita Energy Consumption by Country (scroll horizontally)');
}

function updateHistogram(year) {
  // Filter for the selected year
  const dataByYear = lifeData.filter(d => d.year === +year);

  // Create histogram generator using global domain so bins are comparable across years
  const histGen = d3.histogram()
    .value(d => d.life_expectancy)
    .domain(globalDomain)
    .thresholds(40);

  const bins = histGen(dataByYear);

  // Update scales
  xScale.domain(globalDomain);
  yScale.domain([0, d3.max(bins, d => d.length) || 1]);

  // Bind data to bars
  const bars = svgGroup.selectAll('rect.bar')
    .data(bins, d => `${d.x0}-${d.x1}`);

  // EXIT
  bars.exit()
    .transition()
    .duration(200)
    .attr('y', yScale(0))
    .attr('height', 0)
    .remove();

  // UPDATE
  bars.transition()
    .duration(300)
    .attr('x', d => xScale(d.x0))
    .attr('y', d => yScale(d.length))
    .attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
    .attr('height', d => HIST_HEIGHT - yScale(d.length));

  // ENTER
  const barsEnter = bars.enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d.x0))
    .attr('y', yScale(0))
    .attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
    .attr('height', 0)
    .attr('fill', '#4CAF50')
    .attr('stroke', '#333')
    .attr('stroke-width', 0.5)
    .on('mouseover', (event, d) => {
      const countries = Array.from(new Set(d.map(item => item.country))).sort();
      const maxToShow = 200;
      const shown = countries.slice(0, maxToShow);
      const more = countries.length > shown.length ? `\n...and ${countries.length - shown.length} more` : '';
      tooltip.style('display', 'block')
        .html(`<div class="tooltip-title">Countries (${countries.length})</div><div>${shown.join(', ')}${more}</div>`);
    })
    .on('mousemove', (event) => {
      tooltip.style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY + 10) + 'px');
    })
    .on('mouseout', () => {
      tooltip.style('display', 'none');
    });

  barsEnter.transition()
    .duration(300)
    .attr('y', d => yScale(d.length))
    .attr('height', d => HIST_HEIGHT - yScale(d.length));

  // Update axes
  xAxis = d3.axisBottom(xScale).ticks(10);
  yAxis = d3.axisLeft(yScale).ticks(6);

  xAxisG.transition().duration(300).call(xAxis);
  yAxisG.transition().duration(300).call(yAxis);

  // If no data for year, show a small message
  svgGroup.selectAll('text.no-data').remove();
  if (dataByYear.length === 0) {
    svgGroup.append('text')
      .attr('class', 'no-data')
      .attr('x', HIST_WIDTH / 2)
      .attr('y', HIST_HEIGHT / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .text('No data for selected year');
  }
}

function updateEnergyHistogram(year) {
  const dataByYear = lifeData.filter(d => d.year === +year && !isNaN(d.energy_consumption));

  // Map countries to energy values
  const countries = dataByYear.map(d => ({ country: d.country, energy: d.energy_consumption }));
  // Keep unique countries (in case duplicates), take latest if duplicates
  const byCountry = new Map();
  countries.forEach(d => byCountry.set(d.country, d.energy));
  const countryData = Array.from(byCountry.entries()).map(([country, energy]) => ({ country, energy }));

  // Sort by energy descending for better visual ordering
  countryData.sort((a, b) => b.energy - a.energy);

  const n = countryData.length;
  const barStep = 36; // px per country (larger -> wider bars)
  const innerWidth = Math.max(HIST_WIDTH, n * barStep);
  const totalWidth = innerWidth + HIST_MARGIN.left + HIST_MARGIN.right;

  // Set svg width so container will allow horizontal scrolling when necessary
  const svgEl = d3.select('#histogram-energy');
  svgEl
    .attr('height', HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom)
    .attr('viewBox', `0 0 ${totalWidth} ${HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom}`)
    .attr('width', totalWidth)
    .style('width', totalWidth + 'px');

  // Ensure the visible widths of both histogram containers match (so page scrollbar doesn't appear)
  const histContainer = document.getElementById('histogram-container');
  const energyContainer = document.getElementById('histogram-energy-container');
  const visible = histContainer ? histContainer.clientWidth : null;
  if (visible && energyContainer) {
    // Force the energy container to visually match the life histogram container width
    energyContainer.style.maxWidth = visible + 'px';
  }

  // Update scales
  xScaleE.range([0, innerWidth]).domain(countryData.map(d => d.country));
  yScaleE.domain([0, d3.max(countryData, d => d.energy) || 1]);

  // DATA JOIN for bars
  const bars = svgGroupE.selectAll('rect.country-bar')
    .data(countryData, d => d.country);

  // EXIT
  bars.exit().remove();

  // UPDATE
  bars.transition().duration(300)
    .attr('x', d => xScaleE(d.country))
    .attr('y', d => yScaleE(d.energy))
    .attr('width', Math.max(4, xScaleE.bandwidth()))
    .attr('height', d => HIST_HEIGHT - yScaleE(d.energy));

  // ENTER
  const barsEnter = bars.enter().append('rect')
    .attr('class', 'country-bar')
    .attr('x', d => xScaleE(d.country))
    .attr('y', HIST_HEIGHT)
    .attr('width', Math.max(4, xScaleE.bandwidth()))
    .attr('height', 0)
    .attr('fill', '#2196F3')
    .attr('stroke', '#333')
    .attr('stroke-width', 0.3)
    .on('mouseover', (event, d) => {
      tooltip.style('display', 'block')
        .html(`<div class="tooltip-title">${d.country}</div><div>Energy: ${d.energy}</div>`);
    })
    .on('mousemove', (event) => {
      tooltip.style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY + 10) + 'px');
    })
    .on('mouseout', () => tooltip.style('display', 'none'));

  barsEnter.transition().duration(300)
    .attr('y', d => yScaleE(d.energy))
    .attr('height', d => HIST_HEIGHT - yScaleE(d.energy));

  // Axes
  xAxisE = d3.axisBottom(xScaleE);
  yAxisE = d3.axisLeft(yScaleE).ticks(6);

  xAxisGE.call(xAxisE)
    .selectAll('text')
    .style('text-anchor', 'end')
    .attr('transform', 'rotate(-45)')
    .attr('dx', '-0.6em')
    .attr('dy', '0.1em');

  yAxisGE.transition().duration(300).call(yAxisE);

  svgGroupE.selectAll('text.no-data').remove();
  if (n === 0) {
    svgGroupE.append('text')
      .attr('class', 'no-data')
      .attr('x', HIST_WIDTH / 2)
      .attr('y', HIST_HEIGHT / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .text('No data for selected year');
  }
}

// Load data and initialize everything
initHistogram();
initEnergyHistogram();

d3.csv('data/life-expectancy.csv').then(raw => {
  lifeData = raw.map(d => ({
    country: d.country,
    year: +d.year,
    life_expectancy: +d.life_expectancy,
    energy_consumption: d.energy_consumption === '' ? NaN : +d.energy_consumption
  })).filter(d => !isNaN(d.life_expectancy) && d.life_expectancy > 0 && !isNaN(d.year));

  if (lifeData.length === 0) {
    console.error('No life expectancy data available');
    return;
  }

  // Compute global domain across all years so bins stay consistent
  globalDomain = d3.extent(lifeData, d => d.life_expectancy);
  globalDomainEnergy = d3.extent(lifeData.filter(d => !isNaN(d.energy_consumption)), d => d.energy_consumption);

  // Initialize slider and hook events
  const slider = document.getElementById('yearSlider');
  const label = document.getElementById('yearLabel');

  // Ensure slider range matches dataset range if needed
  const years = Array.from(new Set(lifeData.map(d => d.year))).sort((a,b)=>a-b);
  const minYear = Math.min(1950, years[0]);
  const maxYear = Math.max(2023, years[years.length-1]);
  slider.min = minYear;
  slider.max = maxYear;
  if (+slider.value < minYear || +slider.value > maxYear) slider.value = maxYear;
  label.textContent = slider.value;

  // Initial draw
  updateHistogram(+slider.value);
  updateEnergyHistogram(+slider.value);

  // Event
  slider.addEventListener('input', (e) => {
    const y = +e.target.value;
    label.textContent = y;
    updateHistogram(y);
    updateEnergyHistogram(y);
  });

}).catch(err => {
  console.error('Error loading life-expectancy.csv:', err);
});
