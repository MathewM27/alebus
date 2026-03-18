require('dotenv').config();

module.exports = {
  expo: {
    name: 'alebus',
    slug: 'alebus',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'alebus',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.futurexdesigns.alebus',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      config: {
        googleMapsApiKey: process.env.API_KEY_IOS,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.futurexdesigns.alebus',
      config: {
        googleMaps: {
          apiKey: process.env.API_KEY_ANDROID,
        },
      },
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            image: './assets/images/splash-icon.png',
            backgroundColor: '#151718',
          },
        },
      ],
      'expo-secure-store',
      ['expo-web-browser', { experimentalLauncherActivity: false }],
      '@maplibre/maplibre-react-native',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '3c4eded7-7910-49b8-8801-6ae88a1edd44',
      },
    },
    owner: 'futurexdesigns',
  },
};
