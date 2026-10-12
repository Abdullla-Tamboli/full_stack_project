export function readConfig(env = process.env) {
  const mongoUri = env.MONGODB_URI;
  const jwtSecret = env.JWT_SECRET;
  if (!mongoUri || !/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) {
    throw new Error('MONGODB_URI must be a MongoDB connection URL');
  }
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('replace-')) {
    throw new Error('JWT_SECRET must be a random secret of at least 32 characters');
  }
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const jwtExpiresIn = env.JWT_EXPIRES_IN || '1h';
  if (!/^\d+[smhd]$/.test(jwtExpiresIn) || Number(jwtExpiresIn.slice(0, -1)) < 1) {
    throw new Error('JWT_EXPIRES_IN must be a positive duration such as 1h');
  }
  return { mongoUri, jwtSecret, jwtExpiresIn, port, corsOrigins: (env.CORS_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean) };
}
