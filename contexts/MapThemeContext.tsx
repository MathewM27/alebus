import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";

/* ───────────── Types ───────────── */
export type MapTheme = "dark" | "light";

interface MapThemeContextType {
  mapTheme: MapTheme;
  setMapTheme: (theme: MapTheme) => Promise<void>;
  mapStyleUrl: string;
  isLoading: boolean;
}

/* ───────────── Constants ───────────── */
const STORAGE_KEY = "@alebus/map_theme";
const DEFAULT_THEME: MapTheme = "dark";
const CACHE_VERSION = "20260226";

const STYLE_URLS: Record<MapTheme, string> = {
  dark: `https://alebus-maps-worker.mathewsmwangi6927.workers.dev/styles/dark.json?v=${CACHE_VERSION}`,
  light: `https://alebus-maps-worker.mathewsmwangi6927.workers.dev/styles/light.json?v=${CACHE_VERSION}`,
};

/* ───────────── Context ───────────── */
const MapThemeContext = createContext<MapThemeContextType | undefined>(
  undefined,
);

export function MapThemeProvider({ children }: { children: ReactNode }) {
  const [mapTheme, setMapThemeState] = useState<MapTheme>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from AsyncStorage on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "dark" || stored === "light") {
          setMapThemeState(stored);
        }
      } catch (error) {
        console.error("Error loading map theme:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTheme();
  }, []);

  // Persist theme to AsyncStorage
  const setMapTheme = async (theme: MapTheme) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, theme);
      setMapThemeState(theme);
    } catch (error) {
      console.error("Error saving map theme:", error);
      throw error;
    }
  };

  // Compute the style URL based on current theme
  const mapStyleUrl = STYLE_URLS[mapTheme];

  return (
    <MapThemeContext.Provider
      value={{
        mapTheme,
        setMapTheme,
        mapStyleUrl,
        isLoading,
      }}
    >
      {children}
    </MapThemeContext.Provider>
  );
}

export function useMapTheme() {
  const context = useContext(MapThemeContext);
  if (context === undefined) {
    throw new Error("useMapTheme must be used within a MapThemeProvider");
  }
  return context;
}
