const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const async = require('async');

const { httpGet } = require('../../http');

const router = express.Router();

const db = require('../../db');


const fs = require('fs');

dotenv.config();

async function getDestiny(pathname, opts = {}, postBody) {
  const hostname = opts.useStatsEndpoint
    ? `https://stats.bungie.net`
    : 'https://www.bungie.net';

  let url = `${hostname}/Platform${pathname}`;
  url = url.replace('/Platform/Platform/', '/Platform/');

  opts.headers = opts.headers || {};
  opts.headers['x-api-key'] = process.env.BUNGIE_API_KEY;

  if (opts.useAuthorization) {
    if (pathname === '/App/OAuth/Token/') {
      opts.headers['Authorization'] = `Basic ${Buffer.from(`${process.env.BUNGIE_CLIENT_ID}:${process.env.BUNGIE_CLIENT_SECRET}`).toString('base64')}`;
    } else {
      let tokens = await fsP.readFile('./cache/tokens.json');
      tokens = JSON.parse(tokens.toString());

      console.log(tokens.access_token)

      opts.headers['Authorization'] = `Bearer ${tokens.access_token.value}`;
    }
  }

  if (postBody) {
    opts.method = 'POST';
    if (typeof postBody === 'string') {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.body = postBody;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(postBody);
    }
  }

  console.log(url, opts, postBody)

  return httpGet(url, opts).then(resp => {
    return resp;
  });
}

router.get('/', async function(req, res, next) {
  fs.readFile('./cache/tokens.json', function(err, buf) {
    if (err) {
      res.status(500).send({
        ErrorCode: 500,
        Message: 'VOLUSPA'
      });
    } else {
      let json = buf.toString();
      json = JSON.parse(json);

      res.status(200).send({
        ErrorCode: 1,
        Message: 'VOLUSPA',
        Response: json
      });
    }
  });
});

router.get('/authorize', async function(req, res, next) {
  res.writeHead(302, { Location: `https://www.bungie.net/en/OAuth/Authorize?client_id=${process.env.BUNGIE_CLIENT_ID}&response_type=code` });
  return res.end();
});

router.get('/callback', async function(req, res, next) {
  const code = req.query.code;

  // let request = await fetch(`https://www.bungie.net/Platform/App/OAuth/Token/`, {
  //   method: 'post',
  //   body: `grant_type=authorization_code&code=${code}`,
  //   headers: {
  //     'Authorization': `Basic ${Buffer.from(`${process.env.BUNGIE_CLIENT_ID}:${process.env.BUNGIE_CLIENT_SECRET}`).toString('base64')}`,
  //     'X-API-KEY': process.env.BUNGIE_API_KEY,
  //     'Content-Type': 'application/x-www-form-urlencoded'
  //   }
  // });

  let response = await getDestiny(`/App/OAuth/Token/`, {
    useAuthorization: true
  }, `grant_type=authorization_code&code=${code}`);

  if (response.access_token) {
    const time = new Date().getTime();

    let tokens = {};

    tokens.access_token = {
      value: response.access_token,
      expires_in: time + response.expires_in * 1000
    };

    tokens.refresh_token = {
      value: response.refresh_token,
      expires_in: time + response.refresh_expires_in * 1000
    };

    fs.writeFile('./cache/tokens.json', JSON.stringify(tokens), function(err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully Written to File.");
      }
    });
  }

  res.status(200).send({
    ErrorCode: 201,
    Message: 'VOLUSPA',
    Response: response
  });
});

module.exports = router;
