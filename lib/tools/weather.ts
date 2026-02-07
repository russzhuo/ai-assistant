import { jsonSchema, tool } from "ai";
import { convertToDailyForecast, mapToCurrentWeatherDisplay } from "../utils/whether";

export const getWeatherFromApi = async ({
  city,
  units,
}: {
  city: string;
  units: "imperial" | "metric" | "standard";
}) => {
  const apiKey = process.env.NEXT_PUBLIC_OPEN_WHETHER_API;
  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_OPEN_WHETHER_API in environment");
  }

  try {
    // const geoUrl = new URL("http://api.openweathermap.org/geo/1.0/direct");
    // geoUrl.searchParams.set("q", city);
    // geoUrl.searchParams.set("limit", String(1));
    // geoUrl.searchParams.set("appid", apiKey);

    // const geoResp = await fetch(geoUrl);
    // if (!geoResp.ok) {
    //   const err = await geoResp.json();
    //   throw new Error(err.message || `HTTP ${geoResp.status}`);
    // }

    // const geoData = await geoResp.json();
    // const { lat, lon } = geoData as {
    //   lat: number;
    //   lon: number;
    // };

    const weatherUrl = new URL(
      "https://api.openweathermap.org/data/2.5/weather",
    );

    // weatherUrl.searchParams.set("lat", String(lat));
    // weatherUrl.searchParams.set("lon", String(lon));
    weatherUrl.searchParams.set("units", units);
    weatherUrl.searchParams.set("appid", apiKey);
    weatherUrl.searchParams.set("q", city);
    weatherUrl.searchParams.set("units", units);

    const weatherResp = await fetch(weatherUrl);
    if (!weatherResp.ok) {
      const err = await weatherResp.json();
      throw new Error(err.message || `HTTP ${weatherResp.status}`);
    }

    const weather = await weatherResp.json();

    const forecastUrl = new URL(
      "https://api.openweathermap.org/data/2.5/forecast/",
    );

    forecastUrl.searchParams.set("units", units);
    forecastUrl.searchParams.set("appid", apiKey);
    forecastUrl.searchParams.set("q", city);
    forecastUrl.searchParams.set("units", units);

    const forecastResp = await fetch(forecastUrl);
    if (!forecastResp.ok) {
      const err = await forecastResp.json();
      throw new Error(err.message || `HTTP ${forecastResp.status}`);
    }

    const forecast = await forecastResp.json();

    return {
      forecast: convertToDailyForecast(forecast.list),
      current: mapToCurrentWeatherDisplay(weather),
    };
  } catch (error) {
    console.error("Weather fetch error:", error);
    return { error: `Failed to get weather for "${city}"` };
  }
};

export const weatherTool = tool({
  description:
    "Get the current weather as well as the forecast for the next 4 days for a location",
  inputSchema: jsonSchema<{
    city: string;
    units: "imperial" | "metric" | "standard";
  }>({
    type: "object",
    required: ["city"],
    additionalProperties: false,
    properties: {
      city: {
        type: "string",
        description: "The city to get the weather for",
      },
      units: {
        type: "string",
        enum: ["imperial", "metric", "standard"],
        default: "metric",
        description: "The unit to display the temperature in",
      },
    },
  }),
  execute: async ({ city, units = "metric" }) => {
    try {
      // Your real weather logic here
      const weather = await getWeatherFromApi({ city, units });
    //   console.log(`weather: `, weather);

      return weather;
    } catch (err) {
      // Return shape that model can understand
      return { error: `Could not fetch weather for ${city}` };
    }
  },
});
