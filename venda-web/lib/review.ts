export function isLocalReview(env: NodeJS.ProcessEnv = process.env): boolean {
  if (
    env.VENDA_REVIEW_MODE !== "DEMO_ONLY" ||
    env.VENDA_WEB_LOCAL_TEST !== "true"
  )
    return false;
  try {
    return ["VENDA_WEB_ORIGIN", "VENDA_API_INTERNAL_ORIGIN"].every((key) => {
      const url = new URL(env[key] ?? "");
      return (
        ["http:", "https:"].includes(url.protocol) &&
        ["127.0.0.1", "localhost"].includes(url.hostname) &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
      );
    });
  } catch {
    return false;
  }
}
