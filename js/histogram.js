// Interactive histogram for life expectancy by year
// Loads full CSV once, then updates histogram when the year slider changes

const HIST_MARGIN = { top: 30, right: 30, bottom: 60, left: 60 };
const HIST_WIDTH = 800 - HIST_MARGIN.left - HIST_MARGIN.right;
const HIST_HEIGHT = 500 - HIST_MARGIN.top - HIST_MARGIN.bottom;
// Pixel width per country column (shared between charts)
const BAR_STEP = 36;

let lifeData = [];
let svgGroup, xScale, yScale, xAxisG, yAxisG, xAxis, yAxis, tooltip;
let globalDomain;
// Energy histogram variables
let svgGroupE, xScaleE, yScaleE, xAxisGE, yAxisGE, xAxisE, yAxisE, globalDomainEnergy;
// Continent color scale
const continentColors = {
  'Asia': '#E74C3C',
  'Africa': '#F39C12',
  'Europe': '#3498DB',
  'North America': '#f6ff00',
  'South America': '#9B59B6',
  'Oceania': '#02c21f',
  'Unknown': '#95A5A6'
};
const continentColorScale = d3.scaleOrdinal()
  .domain(Object.keys(continentColors))
  .range(Object.values(continentColors));

function initHistogram() {
  // Prepare SVG and groups
  const svg = d3.select('#histogram')
    .attr('width', HIST_WIDTH + HIST_MARGIN.left + HIST_MARGIN.right)
    .attr('height', HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom)
    .attr('viewBox', `0 0 ${HIST_WIDTH + HIST_MARGIN.left + HIST_MARGIN.right} ${HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Make the life-expectancy SVG fill its container's visible width
  // Width will be set per-update to match column sizing (no fixed style here)

  svgGroup = svg.append('g')
    .attr('transform', `translate(${HIST_MARGIN.left},${HIST_MARGIN.top})`);

  // Scales (x domain set after data load)
  // For per-country bars use a band scale
  xScale = d3.scaleBand().padding(0.05).range([0, HIST_WIDTH]);
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
    .text('Country');

  svgGroup.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(HIST_HEIGHT / 2))
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .text('Life Expectancy (years)');

  svgGroup.append('text')
    .attr('class', 'title')
    .attr('x', HIST_WIDTH / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .text('Life Expectancy by Country (selected year)');

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
    .text('Per-Capita Energy Consumption by Country');
}

function updateHistogram(year) {
  // Build per-country bar chart for the selected year
  const dataByYear = lifeData.filter(d => d.year === +year && !isNaN(d.life_expectancy));

  // Map unique countries to values (keep one value per country)
  const byCountry = new Map();
  dataByYear.forEach(d => byCountry.set(d.country, { life_expectancy: d.life_expectancy, continent: d.continent }));
  const countryData = Array.from(byCountry.entries()).map(([country, data]) => ({ country, life_expectancy: data.life_expectancy, continent: data.continent }));

  // Sort by life expectancy descending for nicer ordering
  countryData.sort((a, b) => b.life_expectancy - a.life_expectancy);

  // Use the same per-country pixel width as the energy chart
  const n = countryData.length;
  const barStep = BAR_STEP;
  const innerWidth = Math.max(HIST_WIDTH, n * barStep);

  // Set explicit SVG width so the container can scroll horizontally if needed
  const totalWidth = innerWidth + HIST_MARGIN.left + HIST_MARGIN.right;
  const svgEl = d3.select('#histogram');
  svgEl
    .attr('height', HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom)
    .attr('viewBox', `0 0 ${totalWidth} ${HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom}`)
    .attr('width', totalWidth)
    .style('width', totalWidth + 'px');

  xScale.range([0, innerWidth]).domain(countryData.map(d => d.country));
  yScale.domain([0, d3.max(countryData, d => d.life_expectancy) || 1]);

  const bars = svgGroup.selectAll('rect.life-bar')
    .data(countryData, d => d.country);

  bars.exit().remove();

  bars.transition().duration(300)
    .attr('x', d => xScale(d.country))
    .attr('y', d => yScale(d.life_expectancy))
    .attr('width', Math.max(1, xScale.bandwidth()))
    .attr('height', d => HIST_HEIGHT - yScale(d.life_expectancy));

  const barsEnter = bars.enter().append('rect')
    .attr('class', 'life-bar')
    .attr('x', d => xScale(d.country))
    .attr('y', HIST_HEIGHT)
    .attr('width', Math.max(1, xScale.bandwidth()))
    .attr('height', 0)
    .attr('fill', d => continentColorScale(d.continent))
    .attr('stroke', '#333')
    .attr('stroke-width', 0.3)
    .on('mouseover', (event, d) => {
      tooltip.style('display', 'block')
        .html(`<div class="tooltip-title">${d.country}</div><div>Life expectancy: ${d.life_expectancy}</div>`);
    })
    .on('mousemove', (event) => {
      tooltip.style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY + 10) + 'px');
    })
    .on('mouseout', () => tooltip.style('display', 'none'));

  barsEnter.transition().duration(300)
    .attr('y', d => yScale(d.life_expectancy))
    .attr('height', d => HIST_HEIGHT - yScale(d.life_expectancy));

  xAxis = d3.axisBottom(xScale);
  yAxis = d3.axisLeft(yScale).ticks(6);

  xAxisG.call(xAxis)
    .selectAll('text')
    .style('text-anchor', 'end')
    .attr('transform', 'rotate(-45)')
    .attr('dx', '-0.6em')
    .attr('dy', '0.1em');

  yAxisG.transition().duration(300).call(yAxis);

  svgGroup.selectAll('text.no-data').remove();
  if (n === 0) {
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
  const countries = dataByYear.map(d => ({ country: d.country, energy: d.energy_consumption, continent: d.continent }));
  // Keep unique countries (in case duplicates), take latest if duplicates
  const byCountry = new Map();
  countries.forEach(d => byCountry.set(d.country, { energy: d.energy, continent: d.continent }));
  const countryData = Array.from(byCountry.entries()).map(([country, data]) => ({ country, energy: data.energy, continent: data.continent }));

  // Sort by energy descending for better visual ordering
  countryData.sort((a, b) => b.energy - a.energy);

  const n = countryData.length;
  const barStep = BAR_STEP; // use shared BAR_STEP
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
    .attr('fill', d => continentColorScale(d.continent))
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

d3.csv('data/life-expectancy.csv?t=' + Date.now()).then(raw => {
  lifeData = raw.map(d => ({
    country: d.country,
    code: d.code,
    continent: (d.continent && d.continent.trim()) || 'Unknown',
    year: +d.year,
    life_expectancy: +d.life_expectancy,
    energy_consumption: d.energy_consumption === '' ? NaN : +d.energy_consumption
  })).filter(d => !isNaN(d.life_expectancy) && d.life_expectancy > 0 && !isNaN(d.year));
  console.log('Life data loaded:', lifeData.length, 'rows. Sample:', lifeData[0]);

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
