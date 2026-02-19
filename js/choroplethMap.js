class ChoroplethMap {

  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 500,
      containerHeight: _config.containerHeight || 400,
      margin: _config.margin || {top: 10, right: 10, bottom: 10, left: 10},
      tooltipPadding: 10,
      legendElementId: _config.legendElementId || 'legend-container',
      legendRectHeight: 12, 
      legendRectWidth: 150,
      colorRange: _config.colorRange || ['#cfe2f2', '#0d306b'],
      legendTitle: _config.legendTitle || 'Value',
      dataProperty: _config.dataProperty || 'life_expectancy'
    }
    console.log('ChoroplethMap config:', this.config);
    console.log('ChoroplethMap data length:', _data ? _data.length : 0);
    this.data = _data;
    this.initVis();
  }
  
  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    let vis = this;
    console.log('ChoroplethMap initVis called');
    console.log('Parent element:', vis.config.parentElement);
    
    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    console.log('Width:', vis.width, 'Height:', vis.height);

    // Select existing SVG or create new one
    let svgElement = d3.select(vis.config.parentElement);
    console.log('SVG element selected:', svgElement.node());
    
    if (svgElement.node() && svgElement.node().tagName === 'svg') {
      // If it's already an SVG, use it
      vis.svg = svgElement;
      console.log('Using existing SVG');
    } else {
      // Otherwise append an SVG
      vis.svg = svgElement.append('svg');
      console.log('Appending new SVG');
    }
    
    vis.svg
        .attr('width', vis.config.containerWidth)
        .attr('height', vis.config.containerHeight);

    // Append group element that will contain our actual chart 
    // and position it according to the given margin config
    vis.chart = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // Initialize projection and path generator
    vis.projection = d3.geoMercator();
    vis.geoPath = d3.geoPath().projection(vis.projection);

    vis.colorScale = d3.scaleLinear()
        .range(vis.config.colorRange)
        .interpolate(d3.interpolateHcl);

    console.log('ChoroplethMap initVis complete, calling updateVis');
    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    // Get values for color scale domain based on the data property
    const dataValues = vis.data
      .filter(d => d.properties && d.properties[vis.config.dataProperty] !== null && d.properties[vis.config.dataProperty] !== undefined)
      .map(d => d.properties[vis.config.dataProperty]);
    
    if (dataValues.length === 0) {
      console.warn('No data found for property:', vis.config.dataProperty);
      return;
    }
    
    const dataExtent = d3.extent(dataValues);
    console.log(`${vis.config.dataProperty} extent:`, dataExtent);
    
    // Update color scale
    vis.colorScale.domain(dataExtent);

    // Define begin and end of the color gradient (legend)
    vis.legendStops = [
      { color: vis.config.colorRange[0], value: dataExtent[0], offset: 0},
      { color: vis.config.colorRange[1], value: dataExtent[1], offset: 100},
    ];

    vis.renderVis();
  }


  renderVis() {
    let vis = this;

    // Data is now an array of GeoJSON Feature objects
    const features = vis.data;
    console.log('renderVis called with', features.length, 'features');

    // Create a feature collection for projection fitting
    const featureCollection = {
      type: 'FeatureCollection',
      features: features
    };

    vis.projection.fitSize([vis.width, vis.height], featureCollection);

    // Append world map
    const countryPath = vis.chart.selectAll('.country')
        .data(features, d => d.properties.name || d.id)
      .join('path')
        .attr('class', 'country')
        .attr('d', d => vis.geoPath(d))
        .attr('fill', d => {
          const dataValue = d.properties && d.properties[vis.config.dataProperty];
          let color;
          if (dataValue) {
            color = vis.colorScale(dataValue);
          } else {
            color = '#e0e0e0';
          }
          return color;
        });

    // Log sample of countries being colored
    console.log('Sample countries with colors:');
    features.slice(0, 5).forEach(d => {
      console.log(d.properties.name, vis.config.dataProperty + ':', d.properties[vis.config.dataProperty]);
    });

    countryPath
        .on('mousemove', (event,d) => {
          const dataValue = d.properties && d.properties[vis.config.dataProperty];
          const dataText = dataValue ? `<strong>${dataValue.toFixed(1)}</strong>` : 'No data available'; 
          const country = (d.properties && d.properties.country) || (d.properties && d.properties.name) || 'Unknown';
          d3.select('#tooltip')
            .style('display', 'block')
            .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
            .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
            .html(`
              <div class="tooltip-title">${country}</div>
              <div>${vis.config.legendTitle}: ${dataText}</div>
            `);
        })
        .on('mouseleave', () => {
          d3.select('#tooltip').style('display', 'none');
        });

    // Render legend in separate HTML element
    vis.renderLegend();
  }

  renderLegend() {
    let vis = this;
    
    // Clear existing legend
    d3.select(`#${vis.config.legendElementId}`).html('');
    
    // Create legend container
    const legendContainer = d3.select(`#${vis.config.legendElementId}`)
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '10px');
    
    // Add title
    legendContainer.append('div')
        .style('font-weight', 'bold')
        .style('min-width', '150px')
        .text(vis.config.legendTitle + ':');
    
    // Create gradient SVG for legend
    const legendSvg = legendContainer.append('svg')
        .attr('width', vis.config.legendRectWidth + 20)
        .attr('height', 30);
    
    // Add gradient definition
    const legendGradient = legendSvg.append('defs').append('linearGradient')
        .attr('id', `legend-gradient-${vis.config.legendElementId}`)
        .attr('x1', '0%')
        .attr('x2', '100%');
    
    // Add gradient stops
    vis.legendStops.forEach(stop => {
      legendGradient.append('stop')
          .attr('offset', stop.offset + '%')
          .attr('stop-color', stop.color);
    });
    
    // Draw gradient rectangle
    legendSvg.append('rect')
        .attr('x', 10)
        .attr('y', 6)
        .attr('width', vis.config.legendRectWidth)
        .attr('height', vis.config.legendRectHeight)
        .attr('fill', `url(#legend-gradient-${vis.config.legendElementId})`);
    
    // Add min and max labels
    legendSvg.append('text')
        .attr('x', 10)
        .attr('y', 25)
        .attr('font-size', '11px')
        .text(Math.round(vis.legendStops[0].value * 10) / 10);
    
    legendSvg.append('text')
        .attr('x', vis.config.legendRectWidth)
        .attr('y', 25)
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .text(Math.round(vis.legendStops[1].value * 10) / 10);
  }
}