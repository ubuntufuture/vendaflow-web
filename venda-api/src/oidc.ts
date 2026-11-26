import {timingSafeEqual} from 'node:crypto';
import {UnauthorizedException,ServiceUnavailableException} from '@nestjs/common';
import * as oidc from 'openid-client';
import type {Config} from './config.js';
export type OidcSettings=Pick<Config,'issuer'|'clientId'|'clientSecret'|'oidcTimeout'|'apiOrigin'|'nodeEnv'|'localDevelopment'>;
const equal=(a:string,b:string)=>{const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);};
export interface Flow {
  verifier: string;
  state: string;
  nonce: string;
}
export class OidcClient {
  private cached: oidc.Configuration | undefined;
  private failures = 0;
  private unavailableUntil = 0;
  constructor(private readonly config: OidcSettings) {}
  private async configuration() {
    if (Date.now() < this.unavailableUntil)
      throw new ServiceUnavailableException();
    if (this.cached) return this.cached;
    const issuer = new URL(this.config.issuer);
    const customFetch: oidc.CustomFetch = async (input, options) => {
      if (new URL(String(input)).origin !== issuer.origin)
        throw new Error("OIDC_ORIGIN_DENIED");
      const { body, ...rest } = options;
      const nativeBody =
        body instanceof Uint8Array ? new Uint8Array(body).buffer : body;
      return fetch(input, {
        ...rest,
        ...(nativeBody !== undefined ? { body: nativeBody } : {}),
        redirect: "error",
        signal: AbortSignal.timeout(this.config.oidcTimeout * 1000),
      });
    };
    this.cached = await oidc.discovery(
      issuer,
      this.config.clientId,
      this.config.clientSecret,
      undefined,
      {
        [oidc.customFetch]: customFetch,
        timeout: this.config.oidcTimeout,
        execute: [
          oidc.enableNonRepudiationChecks,
          ...(this.config.nodeEnv === "test" || this.config.localDevelopment
            ? [oidc.allowInsecureRequests]
            : []),
        ],
      },
    );
    const metadata = this.cached.serverMetadata();
    for (const endpoint of [
      metadata.authorization_endpoint,
      metadata.token_endpoint,
      metadata.jwks_uri,
    ])
      if (!endpoint || new URL(endpoint).origin !== issuer.origin) {
        this.cached = undefined;
        throw new Error("OIDC_METADATA_DENIED");
      }
    return this.cached;
  }
  async begin(additional:{acr_values?:string;claims?:string;max_age?:string}={}): Promise<{ url: string; flow: Flow }> {
    if(Object.keys(additional).some(key=>!['acr_values','claims','max_age'].includes(key)))throw new UnauthorizedException();
    return this.attempt(async () => {
      const configuration = await this.configuration();
      const flow = {
        verifier: oidc.randomPKCECodeVerifier(),
        state: oidc.randomState(),
        nonce: oidc.randomNonce(),
      };
      const challenge = await oidc.calculatePKCECodeChallenge(flow.verifier);
      const url = oidc.buildAuthorizationUrl(configuration, {
        redirect_uri: `${this.config.apiOrigin}/v1/auth/callback`,
        scope: "openid",
        code_challenge: challenge,
        code_challenge_method: "S256",
        state: flow.state,
        nonce: flow.nonce,
        ...additional,
      });
      return { url: url.href, flow };
    });
  }
  async exchange(
    query: Record<string, string>,
    flow: Flow,
  ): Promise<{ issuer: string; subject: string;identityClaims:Record<string,unknown> }> {
    if (!query.state || !equal(query.state, flow.state))
      throw new UnauthorizedException();
    return this.attempt(async () => {
      const configuration = await this.configuration();
      const url = new URL(`${this.config.apiOrigin}/v1/auth/callback`);
      for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
      const tokens = await oidc.authorizationCodeGrant(configuration, url, {
        expectedState: flow.state,
        expectedNonce: flow.nonce,
        pkceCodeVerifier: flow.verifier,
        idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (!claims?.sub || claims.iss !== this.config.issuer)
        throw new UnauthorizedException();
      return { issuer: claims.iss, subject: claims.sub,identityClaims:claims };
    });
  }
  private async attempt<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      if (
        error instanceof oidc.AuthorizationResponseError ||
        (error instanceof oidc.ClientError &&
          /JWT|CLAIM|KEY_SELECTION|AUTHORIZATION_RESPONSE|INVALID_RESPONSE/.test(
            error.code ?? "",
          )) ||
        (error instanceof oidc.ResponseBodyError &&
          ["invalid_grant", "access_denied", "invalid_request"].includes(
            error.error,
          ))
      )
        throw new UnauthorizedException();
      this.failures++;
      if (this.failures >= 5) {
        this.unavailableUntil = Date.now() + 30000;
        this.cached = undefined;
      }
      throw new ServiceUnavailableException();
    }
  }
}
