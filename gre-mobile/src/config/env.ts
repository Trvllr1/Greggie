import { Platform } from "react-native";

const LAN_IP = "192.168.1.247";

const ENV = {
  development: {
    API_BASE_URL:
      Platform.OS === "web"
        ? "http://localhost:8080"
        : `http://${LAN_IP}:8080`,
  },
  production: {
    API_BASE_URL: "https://api.greggie.app", // replace with real production URL
  },
};

const getEnv = () => {
  if (__DEV__) {
    return ENV.development;
  }
  return ENV.production;
};

export default getEnv();
