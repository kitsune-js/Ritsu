import { config } from 'dotenv';
import { AccesTokenResponse, ClientAPI } from 'ritsu';
import express from 'express';

config();

const client = new ClientAPI({
  port: 4000,
  client_id: '684100826914226283',
  client_secret: process.env.CLIENT_SECRET ?? '',
  redirect_uri: 'http://localhost:4000',
  grant_type: 'authorization_code',
  api_version: '9'
});

const custom_app = express();
const data: AccesTokenResponse[] = [];
custom_app.get('/', (req, res) => {
  res.json(data);
});
custom_app.listen(5000);

const registerFunction = (token: AccesTokenResponse) => {
  data.push(token);
};

client.setupRoute(registerFunction);

client.launch(() => console.log('started'));