// WeatherCardSky.tsx
import { CurrentWeatherDisplay, DailyForecast } from "@/lib/utils/whether";
import React from "react";

interface WeatherCardProps {
  forecast: DailyForecast[];
  current: CurrentWeatherDisplay;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ current, forecast }) => {
  if (!current || !forecast || !Array.isArray(forecast) || forecast.length === 0) {
    return (
      <div className="w-full max-w-sm mx-auto rounded-2xl bg-gray-100 p-6 text-center text-gray-600 shadow-md">
        <p className="text-lg font-medium">Weather data unavailable</p>
        <p className="text-sm mt-2 opacity-80">
          Please try again later or check your connection
        </p>
      </div>
    );
  }

  // console.log(forecast);
  const getIconUrl = (iconCode: string) =>
    `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  return (
    <div
      className="
        w-full max-w-sm mx-auto overflow-hidden rounded-2xl
        bg-linear-to-br from-[#0181C2] via-[#04A7F9] to-[#4BC4F7]
        shadow-2xl text-white
      "
    >
      {/* Current weather section */}
      <div className="p-6 pb-4">
        {/* Location & date */}
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">
            {current.location}
          </h2>
          <p className="text-[#B5DEF4] text-sm mt-0.5">{current.date}</p>
        </div>

        {/* Temperature & icon + condition */}
        <div className="flex items-center justify-between my-6">
          <div className="flex items-center gap-5">
            <img
              src={getIconUrl(current.iconCode)}
              alt={current.condition}
              className="w-20 h-20 drop-shadow-md"
              loading="lazy"
            />
            <div>
              <p className="text-5xl font-extrabold tracking-tighter">
                {current.temp}°
              </p>
              <p className="text-[#B5DEF4] text-base mt-1">
                Feels like {current.feelsLike}°
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-semibold">{current.condition}</p>
            <p className="text-[#B5DEF4] text-sm mt-1">{current.description}</p>
          </div>
        </div>

        {/* Quick stats – now only Humidity & Wind */}
        <div className="grid grid-cols-2 gap-6 text-center pt-5 border-t border-white/30">
          <div>
            <p className="text-[#B5DEF4] text-sm font-medium">Humidity</p>
            <p className="text-2xl font-bold mt-1">{current.humidity}</p>
          </div>
          <div>
            <p className="text-[#B5DEF4] text-sm font-medium">Wind</p>
            <p className="text-2xl font-bold mt-1">{current.windSpeed}</p>
          </div>
        </div>
      </div>

      {/* 5-day forecast – white panel */}
      <div className="bg-white px-5 py-6 text-gray-700 border-t border-gray-200">
        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          {forecast.map((day, index) => (
            <div key={index} className="flex flex-col items-center px-1">
              <p className="text-gray-600 font-medium mb-1">{day.day}</p>

              <img
                src={getIconUrl(day.iconCode)}
                alt={day.condition}
                className="w-10 h-10 my-1.5"
                loading="lazy"
              />

              <p className="text-base font-semibold text-gray-800">
                {day.high}° / {day.low}°
              </p>

              <p className="text-gray-600 mt-1 leading-tight">
                {day.condition
                  .toLowerCase()
                  .split(/\s+/)
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;
