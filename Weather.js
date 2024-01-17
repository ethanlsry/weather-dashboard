document.addEventListener("DOMContentLoaded", function(){

  //MAPBOX CODE
  mapboxgl.accessToken = 'pk.eyJ1IjoibW9udG1vcmVuY3k2IiwiYSI6ImNsMTNzaGM3bTBqY24zcXBka3lkdG96OGQifQ.7N0btgH56ImGUyFhElJoRg';
  const map = new mapboxgl.Map({
      container: 'map', // container ID
      style: 'mapbox://styles/mapbox/dark-v10', // style URL
      center: [-98.3, 39.5], // starting position [lng, lat]
      zoom: 2 // starting zoom
  });

  //initialize mapbox geocoder
  const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken, // Set the access token
    mapboxgl: mapboxgl, // Set the mapbox-gl instance
    marker: false // Do not use the default marker style
  });

  // Add the geocoder to the map
  map.addControl(geocoder);

  //click event listener
  map.on('click', (e) => {
    console.log(`user clicked on ${e.lngLat}`);
    let user_defined_lat = e.lngLat.lat;
    let user_defined_lng = e.lngLat.lng;

    //change units so they're not hard-coded- make toggle button?
    let units = "imperial";
    fetchWeather(user_defined_lat, user_defined_lng, units);
  });


  //search event listener
  map.on('load', () => {
    //console.log(`A search event has occurred at ${e.lngLat}`);
      map.addSource('single-point', {
          type: 'geojson',
          data: {
          type: 'FeatureCollection',
          features: []
          }
      });

      map.addLayer({
          id: 'point',
          source: 'single-point',
          type: 'circle',
          paint: {
          'circle-radius': 10,
          'circle-color': '#448ee4'
          }
      });

      // Listen for the `result` event from the Geocoder
      // `result` event is triggered when a user makes a selection
      //  Add a marker at the result's coordinates
      geocoder.on('result', (event) => {
          //map.getSource('single-point').setData(event.result.geometry);
          console.log(event.result.geometry.coordinates)
          let user_defined_lat = event.result.geometry.coordinates[1];
          let user_defined_lng = event.result.geometry.coordinates[0];
      
          //change units so they're not hard-coded- make toggle button?
          let units = "imperial";
          fetchWeather(user_defined_lat, user_defined_lng, units);
      });
  });


//WEATHER CODE

//initialize reader in global scope for parsing JSON code
let reader;

function fetchWeather(lat, long, units){
  console.log("fetching weather now!!!")
  console.log(units);
  //takes lat and long; sends that to weather API
  fetch("https://api.openweathermap.org/data/2.5/weather?lat=" + lat + "&lon=" + long + "&appid=1f14404c7113a7cf664c056a8cfcf176&units=" + units)
  .then(response => response.body)
  .then(body => {
      reader = body.getReader();
      return new ReadableStream({
        start(controller) {
          // The following function handles each data chunk
          function push() {
            // "done" is a Boolean and value a "Uint8Array"
            reader.read().then( ({done, value}) => {
              // If there is no more data to read
              if (done) {
                controller.close();
                return;
              }
              // Get data and send it to the browser via controller
              controller.enqueue(value);
              push();
            })
          }
          push();
        }
      })
    })
    .then(stream => {
      // Respond with our stream
      return new Response(stream, { headers: { "Content-Type": "text/html" } }).text();
    })
    .then(result => readWeatherAPI(result, units))
}

function readWeatherAPI(data, units){
    //convert readable stream response into JSON
    let json_result = JSON.parse(data);

    //parse JSON for data
    let location = json_result.name;

    let description = json_result.weather[0].description;

    let actual_temp = json_result.main.temp;
    let max_temp = json_result.main.temp_max;
    let min_temp = json_result.main.temp_min;
    let sunrise = json_result.sys.sunrise;
    let sunset = json_result.sys.sunset;
    let wind_speed = json_result.wind.speed;

    function convert_UNIX_epoch_to_time(UNIX_time){
      let time_in_mili = UNIX_time * 1000;
      let date_obj = new Date (time_in_mili);
      let time_formatted = date_obj.toLocaleString('en-US', {hour: "numeric",  minute: "numeric"})
      return time_formatted;
    }

    //set temperature units
    let temp_units;
    let wind_units;

    if (units == "imperial"){
      temp_units = "°F";
      wind_units = " mph"
    } else if (units == "metric"){
      temp_units = "°C";
      wind_units = " m/s";
    }

    //output JSON data
    console.log("location: " + location)
    console.log("actual_temp: " + actual_temp.toFixed(1) + temp_units)
    console.log("max_temp: " + max_temp.toFixed(1) + temp_units)
    console.log("min_temp: " + min_temp.toFixed(1) + temp_units)
    console.log("sunrise: " + convert_UNIX_epoch_to_time(sunrise))
    console.log("sunset: " + convert_UNIX_epoch_to_time(sunset))
    console.log("wind_speed: " + wind_speed + wind_units)

    //update front-end with weather data
    //reset text for 
    let location_text = document.getElementById("location");
    location_text.textContent = "location: " + location;

    let actual_temp_text = document.getElementById("actual_temp");
    actual_temp_text.textContent = "current temp: " + actual_temp.toFixed(1) + temp_units;

    let wind_speed_text = document.getElementById("wind_speed");
    wind_speed_text.textContent = "wind speed: "+ wind_speed + wind_units;

    let max_temp_text = document.getElementById("max_temp");
    max_temp_text.textContent = "max temp: " +  max_temp.toFixed(1) + temp_units;

    let min_temp_text = document.getElementById("min_temp");
    min_temp_text.textContent = "min temp: " + min_temp.toFixed(1) + temp_units;

    let sunrise_text = document.getElementById("sunrise");
    sunrise_text.textContent = "sunrise: " + convert_UNIX_epoch_to_time(sunrise) + " EST";

    let sunset_text = document.getElementById("sunset");
    sunset_text.textContent = "sunset: " + convert_UNIX_epoch_to_time(sunset) + ' EST';
}
}, false);