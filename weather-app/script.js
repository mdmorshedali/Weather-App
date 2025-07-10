function App() {
  const [weather, setWeather] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("hourly");
  const [currentTime, setCurrentTime] = React.useState(new Date());
  
  // Auto-refresh every 1 minute
  React.useEffect(() => {
    const refreshTimer = setInterval(() => {
      if (weather?.location) {
        fetchWeather(weather.location);
      }
    }, 60000);
    return () => clearInterval(refreshTimer);
  }, [weather]);
  
  // Update time every second
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Fetch weather for default location (Rajshahi) on first load
  React.useEffect(() => {
    fetchWeather("Rajshahi");
  }, []);
  
  // Fetch location suggestions
  const fetchSuggestions = async (query) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }
    
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5`
      );
      const data = await res.json();
      
      if (data.results) {
        setSuggestions(data.results);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setSuggestions([]);
    }
  };
  
  const fetchWeather = async (location) => {
    setLoading(true);
    setError(null);
    try {
      // First get coordinates for the location
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      );
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("Location not found");
      }
      
      const { latitude, longitude, name, country_code, timezone } = geoData.results[0];
      
      // Then get weather data
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,weather_code,rain,snowfall&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=${timezone || 'auto'}`
      );
      
      if (!weatherRes.ok) throw new Error("Failed to fetch weather data");
      
      const weatherData = await weatherRes.json();
      
      setWeather({
        ...weatherData,
        location: name,
        country_code: country_code.toLowerCase(),
        timezone: timezone
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowSuggestions(false);
    }
  };
  
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchSuggestions(query);
  };
  
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.name);
    fetchWeather(suggestion.name);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchWeather(searchQuery);
    }
  };
  
  const getWeatherIcon = (code) => {
    const icons = {
      0: "☀️",  1: "🌤️",  2: "⛅",  3: "☁️",  
      45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌦️", 
      55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "🌧️", 
      71: "❄️", 73: "❄️", 75: "❄️", 77: "❄️", 
      80: "🌦️", 81: "🌧️", 82: "🌧️", 85: "❄️", 
      86: "❄️", 95: "⛈️", 96: "⛈️", 99: "⛈️"
    };
    return icons[code] || "🌤️";
  };
  
  const getWeatherCondition = (code) => {
    const conditions = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Moderate drizzle",
      55: "Heavy drizzle", 56: "Light freezing drizzle", 57: "Heavy freezing drizzle",
      61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
      66: "Light freezing rain", 67: "Heavy freezing rain",
      71: "Light snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
      80: "Light rain showers", 81: "Moderate rain showers", 82: "Heavy rain showers",
      85: "Light snow showers", 86: "Heavy snow showers",
      95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail"
    };
    return conditions[code] || "Unknown weather condition";
  };
  
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Get current hour index in hourly data
  const getCurrentHourIndex = () => {
    if (!weather || !weather.hourly || !weather.hourly.time) return 0;
    
    const now = new Date();
    for (let i = 0; i < weather.hourly.time.length; i++) {
      const hourTime = new Date(weather.hourly.time[i]);
      if (hourTime.getHours() === now.getHours()) {
        return i;
      }
    }
    return 0;
  };
  
  // Get hourly data from current time to 11 PM
  const getHourlyForecastData = () => {
    if (!weather || !weather.hourly) return [];
    
    const currentIndex = getCurrentHourIndex();
    const hourlyData = [];
    
    for (let i = currentIndex; i < weather.hourly.time.length; i++) {
      const hourTime = new Date(weather.hourly.time[i]);
      if (hourTime.getHours() > 23) break; // Stop at 11 PM
      
      hourlyData.push({
        time: weather.hourly.time[i],
        temp: weather.hourly.temperature_2m[i],
        code: weather.hourly.weather_code[i],
        precip: weather.hourly.precipitation_probability[i],
        rain: weather.hourly.rain[i]
      });
    }
    
    return hourlyData;
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Hour-by-Hour Forecast</h1>
        <p>Time/General • Weather • Time Zone • DST Changes • Sun & Moon</p>
      </div>
      
      <form onSubmit={handleSearchSubmit} className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search for city or place..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((suggestion, index) => (
              <div 
                key={index} 
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.name}, {suggestion.country_code.toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </form>
      
      {error && <div className="error">{error}</div>}
      
      {loading ? (
        <div className="loading">Loading weather data...</div>
      ) : weather ? (
        <>
          <div className="weather-card">
            <div className="location-time">
              <div className="location">
                <span className={`fi fi-${weather.country_code} flag`}></span>
                Hour-by-Hour Forecast for {weather.location}, {weather.country_code.toUpperCase()}
              </div>
              <div className="current-time">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true 
                })}
              </div>
            </div>
            
            <div className="current-weather">
              <div className="current-temp">
                {Math.round(weather.current.temperature_2m)}
              </div>
              <div className="weather-condition">
                {getWeatherIcon(weather.current.weather_code)} {getWeatherCondition(weather.current.weather_code)}
              </div>
            </div>
            
            <div className="weather-details">
              <div className="detail-row">
                <span className="detail-label">Feels Like</span>
                <span className="detail-value">{Math.round(weather.current.apparent_temperature)}°C</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Humidity</span>
                <span className="detail-value">{weather.current.relative_humidity_2m}%</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Precipitation</span>
                <span className="detail-value">
                  Rain: {weather.current.rain || 0}mm • Snow: {weather.current.snowfall || 0}mm
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Chance of Rain</span>
                <span className="detail-value">
                  {weather.hourly.precipitation_probability[getCurrentHourIndex()]}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="tabs">
            <div 
              className={`tab ${activeTab === 'hourly' ? 'active' : ''}`}
              onClick={() => setActiveTab('hourly')}
            >
              Weather Hourly
            </div>
            <div 
              className={`tab ${activeTab === '8day' ? 'active' : ''}`}
              onClick={() => setActiveTab('8day')}
            >
              8 Day Forecast
            </div>
          </div>
          
          <div className="forecast-container">
            {activeTab === 'hourly' && (
              <div className="weather-card">
                <div className="hourly-forecast">
                  {getHourlyForecastData().map((hour, index) => (
                    <div key={index} className="hourly-item">
                      <div className="hourly-time">{formatTime(hour.time)}</div>
                      <div className="weather-icon">{getWeatherIcon(hour.code)}</div>
                      <div className="hourly-temp">{Math.round(hour.temp)}°</div>
                      <div className="hourly-precip">{hour.precip}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === '8day' && (
              <div className="weather-card">
                <div className="daily-forecast">
                  {weather.daily.time.slice(0, 8).map((day, index) => (
                    <div key={day} className="daily-item">
                      <div className="daily-date">{formatDate(day)}</div>
                      <div className="daily-weather">
                        <span className="weather-icon">
                          {getWeatherIcon(weather.daily.weather_code[index])}
                        </span>
                        <span>{getWeatherCondition(weather.daily.weather_code[index])}</span>
                      </div>
                      <div className="daily-temps">
                        <div className="daily-high">{Math.round(weather.daily.temperature_2m_max[index])}°</div>
                        <div className="daily-low">{Math.round(weather.daily.temperature_2m_min[index])}°</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);