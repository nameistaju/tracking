const parseOrigins = (value) =>
  (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const matchesOrigin = (requestOrigin, allowedOrigin) => {
  if (requestOrigin === allowedOrigin) return true;
  if (allowedOrigin.includes("*")) {
    const pattern = allowedOrigin
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    return new RegExp(`^${pattern}$`).test(requestOrigin);
  }
  return false;
};

const requiredEnv = ["MONGO_URI", "JWT_SECRET"];

const validateEnv = () => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

const getCorsOrigins = () => {
  const configured = parseOrigins(process.env.ALLOWED_ORIGINS);

  if (configured.length) return configured;

  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
};

module.exports = {
  getCorsOrigins,
  matchesOrigin,
  validateEnv,
};
