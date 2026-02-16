// Scatterplot: life expectancy (y) vs per-capita energy (x)
// Loads CSV and draws one point per country for selected year

const S_MARGIN = { top: 30, right: 30, bottom: 60, left: 60 };
const S_WIDTH = 800 - S_MARGIN.left - S_MARGIN.right;
const S_HEIGHT = 500 - S_MARGIN.top - S_MARGIN.bottom;

let scatterData = [];
let svgS, svgGroupS, xScaleS, yScaleS, xAxisSG, yAxisSG, xAxisS, yAxisS, tooltipS;
let globalEnergyDomain, globalLifeDomain;

function initScatter() {
  svgS = d3.select('#scatter')
    .attr('width', S_WIDTH + S_MARGIN.left + S_MARGIN.right)
    .attr('height', S_HEIGHT + S_MARGIN.top + S_MARGIN.bottom)
    .attr('viewBox', `0 0 ${S_WIDTH + S_MARGIN.left + S_MARGIN.right} ${S_HEIGHT + S_MARGIN.top + S_MARGIN.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  svgGroupS = svgS.append('g')
    .attr('transform', `translate(${S_MARGIN.left},${S_MARGIN.top})`);

  xScaleS = d3.scaleLinear().range([0, S_WIDTH]);
  yScaleS = d3.scaleLinear().range([S_HEIGHT, 0]);

  xAxisSG = svgGroupS.append('g')
    .attr('transform', `translate(0,${S_HEIGHT})`)
    .attr('class', 'x-axis');

  yAxisSG = svgGroupS.append('g')
    .attr('class', 'y-axis');

  svgGroupS.append('text')
    .attr('class', 'axis-label')
    .attr('x', S_WIDTH / 2)
    .attr('y', S_HEIGHT + 45)
    .attr('text-anchor', 'middle')
    .text('Energy Consumption (per-capita)');

  svgGroupS.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(S_HEIGHT / 2))
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .text('Life Expectancy (years)');

  svgGroupS.append('text')
    .attr('class', 'title')
    .attr('x', S_WIDTH / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .text('Life Expectancy vs Per-Capita Energy Consumption');

  tooltipS = d3.select('#tooltip');
}

function loadScatterDataAndInit() {
  d3.csv('data/life-expectancy.csv').then(raw => {
    scatterData = raw.map(d => ({
      country: d.country,
      year: +d.year,
      life_expectancy: d.life_expectancy === '' ? NaN : +d.life_expectancy,
      energy_consumption: d.energy_consumption === '' ? NaN : +d.energy_consumption
    }));

    // compute global domains
    globalLifeDomain = d3.extent(scatterData.filter(d => !isNaN(d.life_expectancy)), d => d.life_expectancy);
    globalEnergyDomain = d3.extent(scatterData.filter(d => !isNaN(d.energy_consumption)), d => d.energy_consumption);

    if (!svgS) initScatter();

    // initial draw using slider value if present
    const slider = document.getElementById('yearSlider');
    const year = slider ? +slider.value : d3.max(scatterData, d => d.year);
    updateScatter(year);

    // listen to slider changes
    if (slider) slider.addEventListener('input', (e) => updateScatter(+e.target.value));
  }).catch(err => console.error('Error loading CSV for scatter:', err));
}

function updateScatter(year) {
  if (!svgS) initScatter();

  const points = scatterData.filter(d => d.year === +year && !isNaN(d.life_expectancy) && !isNaN(d.energy_consumption));

  svgGroupS.selectAll('text.no-data').remove();
  if (points.length === 0) {
    svgGroupS.selectAll('circle.point').remove();
    svgGroupS.append('text')
      .attr('class', 'no-data')
      .attr('x', S_WIDTH / 2)
      .attr('y', S_HEIGHT / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .text('No data for selected year');
    return;
  }

  // set domains (global for comparability)
  xScaleS.domain(globalEnergyDomain);
  yScaleS.domain(globalLifeDomain);

  xAxisS = d3.axisBottom(xScaleS).ticks(8);
  yAxisS = d3.axisLeft(yScaleS).ticks(6);

  xAxisSG.transition().duration(250).call(xAxisS);
  yAxisSG.transition().duration(250).call(yAxisS);

  const sel = svgGroupS.selectAll('circle.point')
    .data(points, d => d.country);

  sel.exit().transition().duration(200).attr('r', 0).remove();

  sel.transition().duration(300)
    .attr('cx', d => xScaleS(d.energy_consumption))
    .attr('cy', d => yScaleS(d.life_expectancy));

  const enter = sel.enter().append('circle')
    .attr('class', 'point')
    .attr('cx', d => xScaleS(d.energy_consumption))
    .attr('cy', d => yScaleS(d.life_expectancy))
    .attr('r', 0)
    .attr('fill', '#8E44AD')
    .attr('opacity', 0.85)
    .on('mouseover', (event, d) => {
      tooltipS.style('display', 'block')
        .html(`<div class="tooltip-title">${d.country}</div><div>Life: ${d.life_expectancy}<br/>Energy: ${d.energy_consumption}</div>`);
    })
    .on('mousemove', (event) => {
      tooltipS.style('left', (event.pageX + 10) + 'px').style('top', (event.pageY + 10) + 'px');
    })
    .on('mouseout', () => tooltipS.style('display', 'none'));

  enter.transition().duration(300).attr('r', 4);
}

// If the page has a data loader already, prefer waiting for it; otherwise load independently
// We attempt to detect if `lifeData` is present (from other scripts). If present, use it.
if (typeof lifeData !== 'undefined' && Array.isArray(lifeData) && lifeData.length > 0) {
  // derive scatterData from lifeData
  scatterData = lifeData.map(d => ({
    country: d.country,
    year: d.year,
    life_expectancy: d.life_expectancy,
    energy_consumption: d.energy_consumption
  }));
  globalLifeDomain = d3.extent(scatterData.filter(d => !isNaN(d.life_expectancy)), d => d.life_expectancy);
  globalEnergyDomain = d3.extent(scatterData.filter(d => !isNaN(d.energy_consumption)), d => d.energy_consumption);
  initScatter();
  const slider = document.getElementById('yearSlider');
  const year = slider ? +slider.value : d3.max(scatterData, d => d.year);
  updateScatter(year);
  if (slider) slider.addEventListener('input', (e) => updateScatter(+e.target.value));
} else {
  // load the CSV ourselves
  loadScatterDataAndInit();
}
