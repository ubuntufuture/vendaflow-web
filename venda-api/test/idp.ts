// DEMO_ONLY: simulador de protocolo em testes, nunca importado pelo runtime da API.
import { createServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
export async function idpFixture() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "DEMO_ONLY-key";
  jwk.use = "sig";
  jwk.alg = "RS256";
  const codes = new Map<
    string,
    { nonce: string; challenge: string; subject: string; mode: string }
  >();
  let nextSubject = "DEMO_ONLY-user",
    mode = "valid",
    issuer = "";
  const clientId = "DEMO_ONLY-client",
    clientSecret = randomBytes(32).toString("hex");
  let available = true;
  const server = createServer(async (req, res) => {
    try {
      if (!available) {
        res.writeHead(503).end();
        return;
      }
      const url = new URL(req.url!, issuer);
      res.setHeader("Content-Type", "application/json");
      if (url.pathname === "/.well-known/openid-configuration") {
        res.end(
          JSON.stringify({
            issuer,
            authorization_endpoint: `${issuer}/authorize`,
            token_endpoint: `${issuer}/token`,
            jwks_uri: `${issuer}/jwks`,
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code"],
            subject_types_supported: ["public"],
            id_token_signing_alg_values_supported: ["RS256"],
            token_endpoint_auth_methods_supported: ["client_secret_post"],
            code_challenge_methods_supported: ["S256"],
          }),
        );
        return;
      }
      if (url.pathname === "/jwks") {
        res.end(JSON.stringify({ keys: [jwk] }));
        return;
      }
      if (url.pathname === "/authorize") {
        if (
          url.searchParams.get("client_id") !== clientId ||
          url.searchParams.get("code_challenge_method") !== "S256"
        ) {
          res.writeHead(400).end();
          return;
        }
        const code = randomBytes(32).toString("base64url");
        codes.set(code, {
          nonce: url.searchParams.get("nonce")!,
          challenge: url.searchParams.get("code_challenge")!,
          subject: nextSubject,
          mode,
        });
        const target = new URL(url.searchParams.get("redirect_uri")!);
        target.searchParams.set("code", code);
        target.searchParams.set("state", url.searchParams.get("state")!);
        res.writeHead(302, { Location: target.href }).end();
        return;
      }
      if (url.pathname === "/token") {
        let body = "";
        for await (const bytes of req) body += String(bytes);
        const form = new URLSearchParams(body);
        const code = form.get("code")!,
          data = codes.get(code);
        codes.delete(code);
        if (
          !data ||
          form.get("client_id") !== clientId ||
          form.get("client_secret") !== clientSecret ||
          createHash("sha256")
            .update(form.get("code_verifier") ?? "")
            .digest("base64url") !== data.challenge
        ) {
          res.writeHead(400).end(JSON.stringify({ error: "invalid_grant" }));
          return;
        }
        let token = await new SignJWT({
          nonce: data.mode === "nonce" ? "DEMO_ONLY-invalid" : data.nonce,
        })
          .setProtectedHeader({ alg: "RS256", kid: jwk.kid! })
          .setIssuer(data.mode === "issuer" ? `${issuer}/wrong` : issuer)
          .setSubject(data.subject)
          .setAudience(data.mode === "audience" ? "DEMO_ONLY-wrong" : clientId)
          .setIssuedAt()
          .setExpirationTime(data.mode === "expired" ? -30 : "5m")
          .sign(privateKey);
        if (data.mode === "signature") {
          const parts = token.split(".");
          parts[2] = Buffer.alloc(256, 0).toString("base64url");
          token = parts.join(".");
        }
        res.end(
          JSON.stringify({
            access_token: `DEMO_ONLY-${randomBytes(16).toString("hex")}`,
            token_type: "Bearer",
            expires_in: 300,
            id_token: token,
          }),
        );
        return;
      }
      res.writeHead(404).end();
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("IdP sem porta");
  issuer = `http://127.0.0.1:${address.port}`;
  return {
    issuer,
    clientId,
    clientSecret,
    select(subject: string, newMode = "valid") {
      nextSubject = subject;
      mode = newMode;
    },
    setAvailable(value: boolean) {
      available = value;
    },
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
