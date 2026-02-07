function degToCompass(deg: number): string {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface CurrentWeatherDisplay {
  location: string;
  date: string;
  temp: number;
  feelsLike: number;
  condition: string;
  description: string;
  iconCode: string;
  humidity: string;
  windSpeed: string;
  uv: string;
}

export interface DailyForecast {
  day: string; // e.g. "Tue 3", "Wed 4"
  fullDate: string; // e.g. "2026-02-03"
  iconCode: string; // Best icon for the day (e.g. "01d")
  condition: string;
  high: number;
  low: number;
  humidity: number; // average
  windSpeed: number; // average
  pop: number; // max chance of rain
}

function mapToCurrentWeatherDisplay(weatherDetails: any): CurrentWeatherDisplay {
  const weather =
    weatherDetails.current?.weather?.[0] || weatherDetails.weather?.[0];
  const main = weatherDetails.current?.main || weatherDetails.main;
  const wind = weatherDetails.current?.wind || weatherDetails.wind;
  const name =
    weatherDetails.current?.name ||
    weatherDetails.name ||
    weatherDetails.timezone_name ||
    "Unknown";
  const uvi = weatherDetails.current?.uvi; // comes from One Call API

  // Wind direction
  const deg = wind?.deg ?? 0;
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const dir = directions[Math.round(deg / 22.5) % 16];

  const windSpeedKmh = Math.round((wind?.speed ?? 0) * 3.6);
  const windDisplay = `${dir} ${windSpeedKmh}`;

  // Date
  const timestamp = weatherDetails.current?.dt || weatherDetails.dt;
  const dateObj = new Date(timestamp * 1000);
  const dateStr = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return {
    location: name,
    date: dateStr,
    temp: Math.round(main.temp),
    feelsLike: Math.round(main.feels_like),
    condition: weather.main,
    description:
      weather.description?.charAt(0).toUpperCase() +
        weather.description?.slice(1) || "",
    iconCode: weather.icon,
    humidity: `${main.humidity}%`,
    windSpeed: windDisplay,
    uv: uvi !== undefined ? Math.round(uvi).toString() : "N/A",
  };
}

function convertToDailyForecast(listOfForecastDetails: any[]): DailyForecast[] {
  const dailyMap = new Map<string, any[]>();

  // Step 1: Group by date (YYYY-MM-DD)
  listOfForecastDetails.forEach((item) => {
    const dateStr = item.dt_txt.split(" ")[0]; // "2026-02-02"
    if (!dailyMap.has(dateStr)) dailyMap.set(dateStr, []);
    dailyMap.get(dateStr)!.push(item);
  });

  const result: DailyForecast[] = [];

  dailyMap.forEach((dayEntries, dateStr) => {
    // Extract temps
    const temps = dayEntries.map((e) => e.main.temp);
    const high = Math.round(Math.max(...temps));
    const low = Math.round(Math.min(...temps));

    // Best icon: Prefer daytime (pod: "d"), otherwise most frequent
    const dayIcons = dayEntries.filter((e) => e.sys.pod === "d");
    const bestEntry =
      dayIcons.length > 0
        ? dayIcons[Math.floor(dayIcons.length / 2)] // middle of day
        : dayEntries[Math.floor(dayEntries.length / 2)];

    const iconCode = bestEntry.weather[0].icon;
    const condition = bestEntry.weather[0].description;

    // Averages
    const avgHumidity = Math.round(
      dayEntries.reduce((sum, e) => sum + e.main.humidity, 0) /
        dayEntries.length,
    );
    const avgWind = Math.round(
      dayEntries.reduce((sum, e) => sum + e.wind.speed, 0) / dayEntries.length,
    );

    // Max rain probability
    const maxPop = Math.max(...dayEntries.map((e) => e.pop || 0));

    // Format day label: "Tue 3", "Wed 4"
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = date.getDate();

    result.push({
      day: `${dayName} ${dayNum}`,
      fullDate: dateStr,
      iconCode,
      condition,
      high,
      low,
      humidity: avgHumidity,
      windSpeed: avgWind,
      pop: maxPop,
    });
  });

  // Sort by date and return only first 5 days
  return result.slice(0, 5);
}

export { mapToCurrentWeatherDisplay, degToCompass, formatTime, convertToDailyForecast };
