/** Backend-only, read-only onboarding port. Does not create subscriptions or charge. */
export type BillingFailure = 'authentication' | 'permission' | 'rate_limit' | 'provider' | 'timeout' | 'network' | 'invalid_response';
export class BillingProviderError extends Error {
  constructor(readonly category: BillingFailure, readonly status: number | null = null) {
    super(`Mercado Pago: ${category}. Valores sensíveis omitidos.`);
    this.name = 'BillingProviderError';
  }
}
export interface SandboxCredentials {
  mode: 'test';
  country: 'BR';
  accessToken: string;
  publicKey: string;
  readOnly: true;
}
export interface BillingConnection {
  country: 'BR';
  accountAuthenticated: true;
  testAccountMarker: boolean;
  modeSource: 'user_confirmed_test_credentials';
  operations: 'read_only';
}
export interface BillingReadPort {
  inspectConnection(): Promise<BillingConnection>;
}
function validSecret(value: unknown): value is string {
  return typeof value === 'string' && /^(APP_USR|TEST)-[A-Za-z0-9-]{10,220}$/.test(value);
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function sandboxCredentials(input: unknown): SandboxCredentials {
  if (!object(input) || input.mode !== 'test' || input.country !== 'BR' || input.readOnly !== true || !validSecret(input.accessToken) || !validSecret(input.publicKey)) {
    throw new Error('Configuração Mercado Pago de teste inválida. Valores omitidos.');
  }
  return {mode:'test',country:'BR',readOnly:true,accessToken:input.accessToken,publicKey:input.publicKey};
}
export class MercadoPagoSandboxReadClient implements BillingReadPort {
  #credentials: SandboxCredentials;
  constructor(credentials: SandboxCredentials, private readonly transport: typeof fetch = fetch) {
    this.#credentials = sandboxCredentials(credentials);
  }
  private async getAccount(): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await this.transport('https://api.mercadopago.com/users/me', {
        method:'GET', redirect:'error', cache:'no-store', signal:AbortSignal.timeout(8000),
        headers:{Authorization:`Bearer ${this.#credentials.accessToken}`,Accept:'application/json'},
      });
    } catch (error) {
      throw new BillingProviderError(error instanceof Error && ['TimeoutError','AbortError'].includes(error.name) ? 'timeout' : 'network');
    }
    if (!response.ok) {
      await response.body?.cancel().catch(()=>{});
      throw new BillingProviderError(response.status===401?'authentication':response.status===403?'permission':response.status===429?'rate_limit':'provider',response.status);
    }
    const contentType=response.headers.get('content-type')??'';
    if (!contentType.includes('application/json') || Number(response.headers.get('content-length')??0)>131072) {
      await response.body?.cancel().catch(()=>{});
      throw new BillingProviderError('invalid_response',response.status);
    }
    const reader=response.body?.getReader();
    if(!reader) throw new BillingProviderError('invalid_response',response.status);
    let size=0;const parts:Uint8Array[]=[];
    try {
      while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>131072){await reader.cancel();throw new BillingProviderError('invalid_response',response.status);}parts.push(chunk.value);}
      const data:unknown=JSON.parse(Buffer.concat(parts).toString('utf8'));
      if(!object(data))throw new BillingProviderError('invalid_response',response.status);
      return data;
    } catch(error) {
      if(error instanceof BillingProviderError)throw error;
      throw new BillingProviderError('invalid_response',response.status);
    } finally {reader.releaseLock();}
  }
  async inspectConnection(): Promise<BillingConnection> {
    const account=await this.getAccount();
    if(account.site_id!=='MLB' || typeof account.id!=='number' || !Number.isSafeInteger(account.id) || account.id<1) {
      throw new BillingProviderError('invalid_response',200);
    }
    return {country:'BR',accountAuthenticated:true,testAccountMarker:Array.isArray(account.tags)&&account.tags.includes('test_user'),modeSource:'user_confirmed_test_credentials',operations:'read_only'};
  }
}
