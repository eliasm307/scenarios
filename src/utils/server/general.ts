export function getSeverEnvVariable(name: "OPENAI_API_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}
