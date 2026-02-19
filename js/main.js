console.log("Hello world");
let csvData;
let worldData;
let choroplethMap;
let energyChoroplethMap;
let baseCountriesGeometry;  // Store the base geometry for all countries
let countryIdToCode;  // Store the mapping globally

// Load world GeoJSON from CDN and CSV data
Promise.all([
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
  d3.csv('data/life-expectancy.csv')
])
  .then(([topoData, _csvData]) => {
    console.log('Data loading complete. Work with dataset.');
    csvData = _csvData;
    
    // Convert numeric columns
    csvData.forEach(d => {
      d.year = +d.year;
      d.life_expectancy = +d.life_expectancy;
      if (d.energy_consumption) {
        d.energy_consumption = +d.energy_consumption;
      }
    });
    
    // Get the most recent year of data
    const latestYear = d3.max(csvData, d => d.year);
    console.log('Latest year in dataset:', latestYear);
    
    // Store base geometry
    const countries = topojson.feature(topoData, topoData.objects.countries);
    baseCountriesGeometry = countries.features;
    console.log('Total countries in world data:', countries.features.length);
    
    // Create a mapping of country IDs to country codes
    // We need to load the country names that correspond to the numeric IDs in world-atlas
    // Using a hardcoded mapping of world-atlas country IDs to ISO-3 codes
    countryIdToCode = {
      4: 'AFG', 8: 'ALB', 10: 'ATA', 12: 'DZA', 16: 'ASM', 20: 'AND', 24: 'AGO', 28: 'ATG',
      32: 'ARG', 36: 'AUS', 40: 'AUT', 44: 'BHS', 48: 'BHR', 50: 'BGD', 52: 'BRB', 56: 'BEL',
      60: 'BMU', 64: 'BTN', 68: 'BOL', 70: 'BIH', 72: 'BWA', 76: 'BRA', 84: 'BLZ', 86: 'BRN',
      100: 'BGR', 104: 'MMR', 108: 'BDI', 112: 'KHM', 116: 'CMR', 124: 'CAN', 132: 'CPV',
      140: 'CAF', 144: 'LKA', 148: 'TCD', 152: 'CHL', 156: 'CHN', 158: 'TWN', 162: 'COL',
      166: 'COM', 170: 'COG', 174: 'CRI', 180: 'CUB', 191: 'HRV', 196: 'CYP', 203: 'CZE',
      208: 'DNK', 212: 'DMA', 214: 'DOM', 218: 'ECU', 222: 'SLV', 226: 'GNQ', 231: 'ETH',
      232: 'ERI', 233: 'EST', 238: 'FLK', 242: 'FJI', 246: 'FIN', 250: 'FRA', 254: 'GUF',
      258: 'PYF', 260: 'ATF', 266: 'GAB', 268: 'GMB', 270: 'GEO', 276: 'DEU', 288: 'GHA',
      292: 'GIB', 300: 'GRC', 304: 'GRL', 308: 'GRD', 312: 'GLP', 316: 'GUM', 320: 'GTM',
      324: 'GIN', 328: 'GUY', 332: 'HTI', 334: 'HND', 344: 'HKG', 348: 'HUN', 352: 'ISL',
      356: 'IND', 360: 'IDN', 364: 'IRN', 368: 'IRQ', 372: 'IRL', 376: 'ISR', 380: 'ITA',
      384: 'CIV', 388: 'JAM', 392: 'JPN', 398: 'JOR', 400: 'KAZ', 404: 'KEN', 408: 'KPR',
      410: 'KOR', 414: 'KWT', 417: 'KGZ', 418: 'LAO', 428: 'LVA', 422: 'LBN', 426: 'LSO',
      430: 'LBR', 434: 'LBY', 438: 'LIE', 440: 'LTU', 442: 'LUX', 446: 'MAC', 450: 'MDG',
      454: 'MWI', 458: 'MYS', 462: 'MDV', 466: 'MLI', 470: 'MLT', 584: 'MHL', 474: 'MTQ',
      478: 'MRT', 480: 'MUS', 484: 'MEX', 492: 'MCO', 496: 'MNG', 498: 'MDA', 499: 'MNE',
      504: 'MAR', 508: 'MOZ', 512: 'OMN', 516: 'NAM', 520: 'NRU', 524: 'NPL', 528: 'NLD',
      554: 'NZL', 558: 'NIC', 562: 'NER', 566: 'NGA', 578: 'NOR', 586: 'PAK', 585: 'PLW',
      591: 'PAN', 598: 'PNG', 600: 'PRY', 604: 'PER', 608: 'PHL', 616: 'POL', 620: 'PRT',
      624: 'GNB', 626: 'TLS', 630: 'PRI', 634: 'QAT', 638: 'RWA', 642: 'ROU', 643: 'RUS',
      646: 'RWA', 652: 'STP', 654: 'SHN', 659: 'KNA', 660: 'LCA', 662: 'VCT', 666: 'SPM',
      670: 'VCT', 674: 'SMR', 678: 'STP', 682: 'SAU', 686: 'SEN', 688: 'SRB', 690: 'SYC',
      694: 'SLE', 702: 'SGP', 703: 'SVK', 705: 'SVN', 706: 'SOM', 710: 'ZAF', 716: 'ZWE',
      724: 'ESP', 728: 'SSD', 729: 'SDN', 740: 'SUR', 752: 'SWE', 756: 'CHE', 760: 'SYR',
      762: 'TWN', 764: 'THA', 768: 'TGO', 772: 'TON', 776: 'TTO', 788: 'TUN', 792: 'TUR',
      795: 'TKM', 798: 'TUV', 800: 'UGA', 804: 'UKR', 784: 'ARE', 826: 'GBR', 840: 'USA',
      860: 'URY', 862: 'UZB', 548: 'VUT', 862: 'UZB', 887: 'YEM', 894: 'ZMB'
    };
    
    // Initialize choropleth with latest year data
    initializeChoropleth(latestYear);
    initializeEnergyChoropleth(latestYear);
    
    // Set up year slider
    const slider = document.getElementById('yearSlider');
    const label = document.getElementById('yearLabel');
    
    if (slider) {
      slider.addEventListener('input', (e) => {
        const selectedYear = +e.target.value;
        label.textContent = selectedYear;
        updateChoroplethForYear(selectedYear);
        updateEnergyChoroplethForYear(selectedYear);
      });
    }
  })
  .catch(error => {
    console.error('Error loading data:', error);
  });

function initializeChoropleth(year) {
  const filteredData = csvData.filter(d => d.year === year);
  
  // Create a map of country data by country code for this year
  const countryDataMap = {};
  filteredData.forEach(d => {
    countryDataMap[d.code] = d;
  });
  
  // Process world features with life expectancy data
  const countriesWithData = baseCountriesGeometry.map(feature => {
    const isoCode = countryIdToCode[feature.id] || '';
    const countryData = countryDataMap[isoCode];
    
    return {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        name: feature.properties.name || '',
        iso_a3: isoCode,
        id: feature.id,
        life_expectancy: countryData ? parseFloat(countryData.life_expectancy) : null,
        country: countryData ? countryData.country : null,
        continent: countryData ? countryData.continent : null,
        energy_consumption: countryData ? countryData.energy_consumption : null
      }
    };
  });
  
  // Count how many countries have life expectancy data
  const countriesWithLifeExpectancy = countriesWithData.filter(c => c.properties.life_expectancy !== null);
  console.log(`Year ${year}: Matched ${countriesWithLifeExpectancy.length} countries with life expectancy data`);
  
  // Initialize choropleth map if not already created
  if (!choroplethMap) {
    choroplethMap = new ChoroplethMap({
      parentElement: '#choropleth',
      containerWidth: 600,
      containerHeight: 450,
      colorRange: ['#cfe2f2', '#0d306b'],
      legendTitle: 'Life Expectancy (years)',
      dataProperty: 'life_expectancy',
      legendElementId: 'choropleth-legend'
    }, countriesWithData);
    console.log('Choropleth map initialized');
  } else {
    // Update existing choropleth with new year data
    updateChoroplethData(countriesWithData);
  }
}

function updateChoroplethForYear(year) {
  const filteredData = csvData.filter(d => d.year === year);
  
  // Create a map of country data by country code for this year
  const countryDataMap = {};
  filteredData.forEach(d => {
    countryDataMap[d.code] = d;
  });
  
  // Process world features with life expectancy data
  const countriesWithData = baseCountriesGeometry.map(feature => {
    const isoCode = countryIdToCode[feature.id] || '';
    const countryData = countryDataMap[isoCode];
    
    return {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        name: feature.properties.name || '',
        iso_a3: isoCode,
        id: feature.id,
        life_expectancy: countryData ? parseFloat(countryData.life_expectancy) : null,
        country: countryData ? countryData.country : null,
        continent: countryData ? countryData.continent : null,
        energy_consumption: countryData ? countryData.energy_consumption : null
      }
    };
  });
  
  updateChoroplethData(countriesWithData);
}

function updateChoroplethData(countriesWithData) {
  if (choroplethMap) {
    choroplethMap.data = countriesWithData;
    choroplethMap.updateVis();
  }
}

function initializeEnergyChoropleth(year) {
  const filteredData = csvData.filter(d => d.year === year);
  
  // Create a map of country data by country code for this year
  const countryDataMap = {};
  filteredData.forEach(d => {
    countryDataMap[d.code] = d;
  });
  
  // Process world features with energy consumption data
  const countriesWithData = baseCountriesGeometry.map(feature => {
    const isoCode = countryIdToCode[feature.id] || '';
    const countryData = countryDataMap[isoCode];
    
    return {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        name: feature.properties.name || '',
        iso_a3: isoCode,
        id: feature.id,
        life_expectancy: countryData ? parseFloat(countryData.life_expectancy) : null,
        country: countryData ? countryData.country : null,
        continent: countryData ? countryData.continent : null,
        energy_consumption: countryData ? parseFloat(countryData.energy_consumption) : null
      }
    };
  });
  
  // Count how many countries have energy data
  const countriesWithEnergy = countriesWithData.filter(c => c.properties.energy_consumption !== null);
  console.log(`Year ${year}: Matched ${countriesWithEnergy.length} countries with energy data`);
  
  // Initialize energy choropleth map if not already created
  if (!energyChoroplethMap) {
    energyChoroplethMap = new ChoroplethMap({
      parentElement: '#choropleth-energy',
      containerWidth: 600,
      containerHeight: 450,
      colorRange: ['#fff5e6', '#cc8800'],
      legendTitle: 'Energy Consumption (TWh)',
      dataProperty: 'energy_consumption',
      legendElementId: 'choropleth-energy-legend'
    }, countriesWithData);
    console.log('Energy choropleth map initialized');
  } else {
    // Update existing energy choropleth with new year data
    updateEnergyChoroplethData(countriesWithData);
  }
}

function updateEnergyChoroplethForYear(year) {
  const filteredData = csvData.filter(d => d.year === year);
  
  // Create a map of country data by country code for this year
  const countryDataMap = {};
  filteredData.forEach(d => {
    countryDataMap[d.code] = d;
  });
  
  // Process world features with energy consumption data
  const countriesWithData = baseCountriesGeometry.map(feature => {
    const isoCode = countryIdToCode[feature.id] || '';
    const countryData = countryDataMap[isoCode];
    
    return {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        name: feature.properties.name || '',
        iso_a3: isoCode,
        id: feature.id,
        life_expectancy: countryData ? parseFloat(countryData.life_expectancy) : null,
        country: countryData ? countryData.country : null,
        continent: countryData ? countryData.continent : null,
        energy_consumption: countryData ? parseFloat(countryData.energy_consumption) : null
      }
    };
  });
  
  updateEnergyChoroplethData(countriesWithData);
}

function updateEnergyChoroplethData(countriesWithData) {
  if (energyChoroplethMap) {
    energyChoroplethMap.data = countriesWithData;
    energyChoroplethMap.updateVis();
  }
}

function computeDays(disasterDate){
  	let tokens = disasterDate.split("-");

  	let year = +tokens[0];
  	let month = +tokens[1];
  	let day = +tokens[2];

    return (Date.UTC(year, month-1, day) - Date.UTC(year, 0, 0)) / 24 / 60 / 60 / 1000 ;

  }