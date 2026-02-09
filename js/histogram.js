// Interactive histogram for life expectancy by year
// Loads full CSV once, then updates histogram when the year slider changes

const HIST_MARGIN = { top: 30, right: 30, bottom: 60, left: 60 };
const HIST_WIDTH = 800 - HIST_MARGIN.left - HIST_MARGIN.right;
const HIST_HEIGHT = 500 - HIST_MARGIN.top - HIST_MARGIN.bottom;

let lifeData = [];
let svgGroup, xScale, yScale, xAxisG, yAxisG, xAxis, yAxis, tooltip;
let globalDomain;

function initHistogram() {
  // Prepare SVG and groups
  const svg = d3.select('#histogram')
    .attr('width', HIST_WIDTH + HIST_MARGIN.left + HIST_MARGIN.right)
    .attr('height', HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom)
    .attr('viewBox', `0 0 ${HIST_WIDTH + HIST_MARGIN.left + HIST_MARGIN.right} ${HIST_HEIGHT + HIST_MARGIN.top + HIST_MARGIN.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

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

// Load data and initialize everything
initHistogram();

d3.csv('data/life-expectancy.csv').then(raw => {
  lifeData = raw.map(d => ({
    country: d.country,
    year: +d.year,
    life_expectancy: +d.life_expectancy
  })).filter(d => !isNaN(d.life_expectancy) && d.life_expectancy > 0 && !isNaN(d.year));

  if (lifeData.length === 0) {
    console.error('No life expectancy data available');
    return;
  }

  // Compute global domain across all years so bins stay consistent
  globalDomain = d3.extent(lifeData, d => d.life_expectancy);

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

  // Event
  slider.addEventListener('input', (e) => {
    const y = +e.target.value;
    label.textContent = y;
    updateHistogram(y);
  });

}).catch(err => {
  console.error('Error loading life-expectancy.csv:', err);
});
