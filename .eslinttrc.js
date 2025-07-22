module.exports = {
  extends: [
    "react-app", // Ou "react-app/jest"
    "plugin:react-hooks/recommended",
  ],
  rules: {
    "no-unused-vars": "warn",
  },
  globals: {
    __app_id: "readonly",
    __firebase_config: "readonly",
    __gemini_api_key: "readonly",
    __initial_auth_token: "readonly",
  },
};
