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

  #app: Express;
  constructor(options: ClientOptions) {
    this.port = options.port;
    this.client_id = options.client_id;
    this.#client_secret = options.client_secret;
    this.redirect_uri = options.redirect_uri;
    this.grant_type = options.grant_type;
    this.api_version = options.api_version;

    this.#app = express();
  }

  launch = async (onStart?: () => void) => {
    return this.#app.listen(this.port, onStart);
  };

  setupRoute = (
    registerFunction: (token: AccesTokenResponse) => void,
    redirectFunction?: (req: Request, res: Response) => void
  ) => {
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

      registerFunction(result);
    });
  };
}

export { ClientAPI, ClientOptions, AccesTokenResponse, APIVersions };
