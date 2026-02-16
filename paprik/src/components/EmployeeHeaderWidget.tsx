import { useState, useEffect } from 'react';
import { User, Calendar, Clock, Cloud } from 'lucide-react';
import type { Profile } from '../types/database';

interface EmployeeHeaderWidgetProps {
  profile: Profile;
}

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
}

export default function EmployeeHeaderWidget({ profile }: EmployeeHeaderWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const latitude = 52.3676;
        const longitude = 4.9041;

        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=Europe/Amsterdam`
        );
        const data = await response.json();

        const weatherCode = data.current.weather_code;
        const weatherDescription = getWeatherDescription(weatherCode);

        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          description: weatherDescription,
          icon: getWeatherIcon(weatherCode),
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching weather:', error);
        setLoading(false);
      }
    };

    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 600000);

    return () => clearInterval(weatherInterval);
  }, []);

  const getWeatherDescription = (code: number): string => {
    const weatherCodes: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Foggy',
      51: 'Light drizzle',
      53: 'Drizzle',
      55: 'Heavy drizzle',
      61: 'Light rain',
      63: 'Rain',
      65: 'Heavy rain',
      71: 'Light snow',
      73: 'Snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Light showers',
      81: 'Showers',
      82: 'Heavy showers',
      85: 'Light snow showers',
      86: 'Snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with hail',
    };
    return weatherCodes[code] || 'Unknown';
  };

  const getWeatherIcon = (code: number): string => {
    if (code === 0 || code === 1) return '☀️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code === 45 || code === 48) return '🌫️';
    if (code >= 51 && code <= 57) return '🌧️';
    if (code >= 61 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 85 && code <= 86) return '🌨️';
    if (code >= 95 && code <= 99) return '⛈️';
    return '🌤️';
  };

  const formatDate = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl shadow-lg p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center space-x-4">
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-white/80 text-sm font-medium">Welcome back</p>
            <h2 className="text-white text-2xl font-bold">{profile.full_name}</h2>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs">Date</p>
              <p className="text-white font-semibold">{formatDate(currentTime)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs">Time</p>
              <p className="text-white font-semibold text-xl tabular-nums">{formatTime(currentTime)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <Cloud className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-white/80 text-sm font-medium">Today's Weather</p>
            {loading ? (
              <p className="text-white text-lg">Loading...</p>
            ) : weather ? (
              <div className="flex items-center space-x-2">
                <span className="text-3xl">{weather.icon}</span>
                <div>
                  <p className="text-white text-2xl font-bold">{weather.temperature}°C</p>
                  <p className="text-white/90 text-sm">{weather.description}</p>
                </div>
              </div>
            ) : (
              <p className="text-white text-sm">Weather unavailable</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
