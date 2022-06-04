import axios from 'axios';
import { Oauth2Manager } from 'higa';
import express, { Express, Request, Response } from 'express';

type APIVersions = '6' | '7' | '8' | '9' | '10';

interface ClientOptions {
  port: number;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
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
  redirect_uri: string;

  #manager: Oauth2Manager;

  functions: ClientFunctions;

  #app: Express;
  constructor(options: ClientOptions, functions: ClientFunctions) {
    this.port = options.port;
    this.#manager = new Oauth2Manager(
      options.client_id,
      options.client_secret,
      options.api_version
    );
    this.redirect_uri = options.redirect_uri;

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
      const code = <string>req.query.code;
      if (redirectFunction) redirectFunction(req, res);
      else res.send(`No redirection function provided`);

      const result = await this.#manager.getAccessToken(
        code,
        this.redirect_uri
      );

      this.functions.registerFunction(result);
      this.#reload(result);
    });
  };

  #reload = async (token: AccesTokenResponse) => {
    setInterval(async () => {
      const result = await this.#manager.refreshAccessToken(
        token.refresh_token
      );
      this.functions.deleteToken(token);
      this.functions.registerFunction(result);
      this.#reload(result);
    }, token.expires_in * 900);
  };
}

export { ClientAPI, ClientOptions, AccesTokenResponse, APIVersions };
