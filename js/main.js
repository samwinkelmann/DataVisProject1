console.log("Hello world");
let data;

d3.csv('data/life-expectency.csv')
  .then(_data => {
  	console.log('Data loading complete. Work with dataset.');
  	data = _data;
    console.log(data);
.then(() => {
	// main.js currently only loads data for inspection to avoid runtime errors
	console.log('main.js: data ready (no processing performed)');
})
.catch(error => {
    console.error('Error:');
    console.log(error);
});

function computeDays(disasterDate){
  	let tokens = disasterDate.split("-");

  	let year = +tokens[0];
  	let month = +tokens[1];
  	let day = +tokens[2];

    return (Date.UTC(year, month-1, day) - Date.UTC(year, 0, 0)) / 24 / 60 / 60 / 1000 ;

  }