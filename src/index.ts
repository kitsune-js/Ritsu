import axios from 'axios';
import express, { Express, Request, Response } from 'express';

type APIVersions = '6' | '7' | '8' | '9' | '10';

interface ClientOptions {
  port: number;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  grant_type: string;
  api_version: APIVersions;
}

interface ClientFunctions {
  getAllTokens: () => Promise<AccesTokenResponse[]>;
  deleteToken: (token: AccesTokenResponse) => Promise<void>;
  registerFunction: (token: AccesTokenResponse) => void;
}

interface AccesTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

class ClientAPI {
  port: number;
  client_id: string;
  #client_secret: string;
  redirect_uri: string;
  grant_type: string;
  api_version: APIVersions;

  functions: ClientFunctions;

  #app: Express;
  constructor(options: ClientOptions, functions: ClientFunctions) {
    this.port = options.port;
    this.client_id = options.client_id;
    this.#client_secret = options.client_secret;
    this.redirect_uri = options.redirect_uri;
    this.grant_type = options.grant_type;
    this.api_version = options.api_version;

    this.functions = functions;

    this.#app = express();
  }

  launch = async (onStart?: () => void) => {
    for (const token of await this.functions.getAllTokens()) {
      this.#reload(token);
    }
    return this.#app.listen(this.port, onStart);
  };

  setupRoute = (redirectFunction?: (req: Request, res: Response) => void) => {
    this.#app.get('/', async (req, res) => {
      const code = req.query.code;
      if (redirectFunction) redirectFunction(req, res);
      else res.send(`No redirection function provided`);

      const { data: result } = await axios.post<AccesTokenResponse>(
        `https://discord.com/api/v${this.api_version}/oauth2/token`,
        `client_id=${this.client_id}&client_secret=${
          this.#client_secret
        }&grant_type=${this.grant_type}&code=${code}&redirect_uri=${
          this.redirect_uri
        }`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.functions.registerFunction(result);
      this.#reload(result);
    });
  };

  #reload = async (token: AccesTokenResponse) => {
    setInterval(async () => {
      const { data: result } = await axios.post<AccesTokenResponse>(
        `https://discord.com/api/v${this.api_version}/oauth2/token`,
        `client_id=${this.client_id}&client_secret=${
          this.#client_secret
        }&grant_type=refresh_token&refresh_token=${token.refresh_token}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      this.functions.deleteToken(token);
      this.functions.registerFunction(result);
      this.#reload(result);
    }, token.expires_in);
  };
}

export { ClientAPI, ClientOptions, AccesTokenResponse, APIVersions };
