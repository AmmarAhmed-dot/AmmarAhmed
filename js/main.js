let cities = [];

// Fetch and parse the CSV file
async function loadCities() {
  try {
    const response = await fetch("city_coordinates.csv");
    const data = await response.text();

    // Parse CSV data
    const rows = data.split("\n");
    rows.forEach((row) => {
      const [latitude, longitude, city, country] = row.split(",");
      if (latitude && longitude && city && country) {
        cities.push({
          lat: parseFloat(latitude.trim()),
          lon: parseFloat(longitude.trim()),
          city: city.trim(),
          country: country.trim(),
        });
      }
    });

    populateCitySelector();
  } catch (error) {
    console.error("Error loading cities:", error);
  }
}

// Populate the city dropdown
function populateCitySelector() {
  const citySelector = document.getElementById("city-selector");
  cities.forEach(({ city, country }) => {
    const option = document.createElement("option");
    option.value = JSON.stringify({ city, country });
    option.textContent = `${city}, ${country}`;
    citySelector.appendChild(option);
  });
}

// Show loader while fetching weather data
const showLoader = () => {
  document.getElementById("loader").style.display = "block";
  document.getElementById("forecast-block").innerHTML = "";
};

// Hide loader after fetching weather data
const hideLoader = () => {
  document.getElementById("loader").style.display = "none";
};

// Fetch and display weather data
function getWeather() {
  const selectedOption = document.getElementById("city-selector").value;

  if (!selectedOption) {
    alert("Please select a city!");
    return;
  }

  const { city, country } = JSON.parse(selectedOption);
  const cityData = cities.find((c) => c.city === city && c.country === country);

  if (!cityData) {
    alert("City not found!");
    return;
  }

  const { lat, lon } = cityData;
  const apiUrl = `http://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=civil&output=json`;
//   const apiUrl = `http://www.7timer.info/bin/api.pl?lon=${lon}&lat=${lat}&product=astro&output=json`;
//   const apiUrl = `http://www.7timer.info/bin/astro.php?lon=${lon}&lat=${lat}&ac=0&lang=en&unit=metric&output=internal&tzshift=0`;

  showLoader();

  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      hideLoader();
      console.log("API Response:", data); // Inspect the API response structure
      displayForecast(data.dataseries, data.init); // Pass init dynamically
    })
    .catch((error) => {
      console.error("Error fetching weather data:", error);
      hideLoader();
    });
}

// Display weather forecast as cards
function displayForecast(forecast, initDateStr) {
  const forecastBlock = document.getElementById("forecast-block");
  forecastBlock.innerHTML = "";

  // Check if forecast data exists
  if (!forecast || forecast.length === 0) {
    forecastBlock.innerHTML = `<p>No forecast data available.</p>`;
    return;
  }

  // Parse the init date dynamically from the API response
  const year = parseInt(initDateStr.slice(0, 4), 10);
  const month = parseInt(initDateStr.slice(4, 6), 10) - 1; // Months are 0-indexed
  const day = parseInt(initDateStr.slice(6, 8), 10);
  const hour = parseInt(initDateStr.slice(8, 10), 10);
  const baseDate = new Date(year, month, day, hour);

  // Group forecast data into weekdays
  let days = [];
  forecast.forEach((dayData) => {
    // Calculate the date for the timepoint
    const forecastDate = new Date(
      baseDate.getTime() + dayData.timepoint * 60 * 60 * 1000
    );

    // Format the date to get weekday and date
    const formattedDate = forecastDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    // Group the forecast by date
    let dayIndex = days.findIndex((d) => d.date === formattedDate);
    if (dayIndex === -1) {
      days.push({
        date: formattedDate,
        highTemp: dayData.temp2m,
        lowTemp: dayData.temp2m, // initially set low temp to high temp
        weather: dayData.weather,
        icon: getWeatherIcon(dayData.weather),
      });
    } else {
      if (dayData.temp2m > days[dayIndex].highTemp) {
        days[dayIndex].highTemp = dayData.temp2m; // update high temp
      }
      if (dayData.temp2m < days[dayIndex].lowTemp) {
        days[dayIndex].lowTemp = dayData.temp2m; // update low temp
      }
    }
  });

  // Limit to 7 cards
  days = days.slice(0, 7);

  // Create a card for each day
  days.forEach((day) => {
    console.log("day", day)
    const card = document.createElement("div");
    card.classList.add("bm-2"); // Your custom class for styling

    card.innerHTML = `
        <div class="card h-100">
          <div class="card-body">
            <p class="weather-date">${day.date}</p>
            <div class="weather-icon-div"><span>${day.icon}</span></div>
            <p class="weather-description">${day.weather.toUpperCase()}</p>
            <p class="weather-temperatures">
              High: <span class="celcius">${day.highTemp} ºC</span>
              <span class="fahrenheit" style="display: none;">
                ${Math.round((day.highTemp * 9) / 5 + 32)} ºF
              </span>
            </p>
            <p class="weather-temperatures">
              Low: <span class="celcius">${day.lowTemp} ºC</span>
              <span class="fahrenheit" style="display: none;">
                ${Math.round((day.lowTemp * 9) / 5 + 32)} ºF
              </span>
            </p>
          </div>
        </div>
      `;

    forecastBlock.appendChild(card);
  });
}

// Get weather icon (placeholder)
// const getWeatherIcon = (condition) => {
//   const icons = {
//     clear: "☀️",
//     cloudy: "⛅️",
//     rain: "🌧️",
//     snow: "❄️",
//   };
//   return icons[condition.toLowerCase()] || "🌤️";
// };

const getWeatherIcon = (condition) => {
  const c = condition.toLowerCase();
  const isNight = c.includes("night");

  if (c.includes("clear")) return isNight ? "🌕" : "☀️";
  if (c.includes("pcloudy") || c.includes("partly")) return isNight ? "🌤️" : "⛅️";
  if (c.includes("cloudy")) return isNight ? "☁️🌙" : "☁️";
  if (c.includes("rain")) return isNight ? "🌧️🌙" : "🌧️";
  if (c.includes("snow")) return isNight ? "❄️🌙" : "❄️";
  if (c.includes("thunderstorm")) return isNight ? "⛈️🌙" : "⛈️";
  if (c.includes("humid")) return isNight ? "🌫️🌙" : "🌫️";

  return isNight ? "🌤️🌙" : "🌤️"; // fallback icon
};

// Initialize the app by loading cities
document.addEventListener("DOMContentLoaded", () => {
  loadCities();
});
