const API_BASE = 'https://api.open-meteo.com/v1';

const elements = {
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    locationBtn: document.getElementById('location-btn'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    weatherDisplay: document.getElementById('weather-display'),
    temp: document.getElementById('temp'),
    condition: document.getElementById('condition'),
    location: document.getElementById('location'),
    weatherIcon: document.getElementById('weather-icon'),
    humidity: document.getElementById('humidity'),
    wind: document.getElementById('wind'),
    feelsLike: document.getElementById('feels-like'),
    forecastList: document.getElementById('forecast-list')
};

const weatherCodes = {
    0: { icon: '☀️', text: 'Clear sky' },
    1: { icon: '🌤️', text: 'Mainly clear' },
    2: { icon: '⛅', text: 'Partly cloudy' },
    3: { icon: '☁️', text: 'Overcast' },
    45: { icon: '🌫️', text: 'Fog' },
    48: { icon: '🌫️', text: 'Depositing rime fog' },
    51: { icon: '🌧️', text: 'Drizzle' },
    53: { icon: '🌧️', text: 'Moderate drizzle' },
    55: { icon: '🌧️', text: 'Dense drizzle' },
    61: { icon: '🌧️', text: 'Slight rain' },
    63: { icon: '🌧️', text: 'Moderate rain' },
    65: { icon: '🌧️', text: 'Heavy rain' },
    71: { icon: '🌨️', text: 'Slight snow' },
    73: { icon: '🌨️', text: 'Moderate snow' },
    75: { icon: '❄️', text: 'Heavy snow' },
    80: { icon: '🌦️', text: 'Slight rain showers' },
    81: { icon: '🌦️', text: 'Moderate rain showers' },
    82: { icon: '🌦️', text: 'Violent rain showers' },
    95: { icon: '⛈️', text: 'Thunderstorm' },
    96: { icon: '⛈️', text: 'Thunderstorm with hail' },
    99: { icon: '⛈️', text: 'Thunderstorm with heavy hail' }
};

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.error.classList.add('hidden');
    elements.weatherDisplay.classList.add('hidden');
}

function showError(message) {
    elements.loading.classList.add('hidden');
    elements.error.textContent = message;
    elements.error.classList.remove('hidden');
    elements.weatherDisplay.classList.add('hidden');
}

function showWeather() {
    elements.loading.classList.add('hidden');
    elements.error.classList.add('hidden');
    elements.weatherDisplay.classList.remove('hidden');
    startWeatherAnimations();
}

function startWeatherAnimations() {
    const windArrow = document.querySelector('.wind-arrow');
    if (windArrow) {
        let rotation = 0;
        setInterval(() => {
            rotation = (rotation + 45) % 360;
            windArrow.style.transform = `rotate(${rotation}deg)`;
        }, 2000);
    }
    
    const weatherIcon = document.getElementById('weather-icon');
    if (weatherIcon) {
        weatherIcon.style.animation = 'float 6s ease-in-out infinite';
    }
}

function getWeatherIcon(code) {
    return weatherCodes[code]?.icon || '🌡️';
}

function getWeatherText(code) {
    return weatherCodes[code]?.text || 'Unknown';
}

async function fetchWeather(lat, lon) {
    const url = `${API_BASE}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch weather data');
    return response.json();
}

async function geocodeCity(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search city');
    const data = await response.json();
    if (!data.results?.length) throw new Error('City not found');
    return data.results[0];
}

function updateDisplay(data, cityName) {
    const current = data.current;
    const daily = data.daily;

    elements.temp.textContent = Math.round(current.temperature_2m);
    elements.condition.textContent = getWeatherText(current.weather_code);
    elements.location.textContent = cityName;
    elements.weatherIcon.textContent = getWeatherIcon(current.weather_code);
    elements.humidity.textContent = `${current.relative_humidity_2m}%`;
    elements.wind.innerHTML = `<span class="wind-arrow">→</span> ${Math.round(current.wind_speed_10m)} km/h`;
    elements.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;

    elements.forecastList.innerHTML = '';
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayName = i === 0 ? 'Today' : dayNames[date.getDay()];

        const dayEl = document.createElement('div');
        dayEl.className = 'forecast-day';
        dayEl.innerHTML = `
            <span class="forecast-day-name">${dayName}</span>
            <span class="forecast-day-icon">${getWeatherIcon(daily.weather_code[i])}</span>
            <span class="forecast-day-temp">${Math.round(daily.temperature_2m_max[i])}°</span>
        `;
        elements.forecastList.appendChild(dayEl);
    }

    showWeather();
}

async function handleSearch() {
    const city = elements.searchInput.value.trim();
    if (!city) return;

    showLoading();

    try {
        const location = await geocodeCity(city);
        const weather = await fetchWeather(location.latitude, location.longitude);
        updateDisplay(weather, location.name);
    } catch (err) {
        showError(err.message);
    }
}

async function handleLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading();

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const weather = await fetchWeather(position.coords.latitude, position.coords.longitude);
                const geoUrl = `https://api.open-meteo.com/v1/geocode?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`;
                const geoResponse = await fetch(geoUrl);
                const cityName = 'Your Location';
                updateDisplay(weather, cityName);
            } catch (err) {
                showError(err.message);
            }
        },
        (err) => {
            showError('Unable to get your location. Please enable location access.');
        }
    );
}

elements.searchBtn.addEventListener('click', handleSearch);
elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
elements.locationBtn.addEventListener('click', handleLocation);

handleLocation();