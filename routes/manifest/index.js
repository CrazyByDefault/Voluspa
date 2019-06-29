const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const async = require('async');

const { fetch } = require('../../http2');

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

  if (opts.useAccessToken) {
    if (pathname === '/App/OAuth/Token/') {

      opts.headers['Authorization'] = `Basic ${Buffer.from(`${process.env.BUNGIE_CLIENT_ID}:${process.env.BUNGIE_CLIENT_SECRET}`).toString('base64')}`;

    } else {

      let tokens = await fs.promises.readFile('./cache/tokens.json');
      tokens = JSON.parse(tokens.toString());

      let now = new Date().getTime() + 10000;
      let then = new Date(tokens.access_token.expires_in);

      let accessToken = tokens.access_token.value;

      if (now > then) {
        let response = await getDestiny(`/App/OAuth/Token/`, {
          useAccessToken: true
        }, `grant_type=refresh_token&refresh_token=${tokens.refresh_token.value}`);

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

          accessToken = tokens.access_token.value;
        }
      }

      opts.headers['Authorization'] = `Bearer ${accessToken}`;

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

  console.log(url, opts)

  return fetch(url, opts).then(resp => {
    console.log(`95`, resp)
    return resp;
  }).catch(err => {
    console.log(`98`, err.statusCode)
  });
}

const CURRENT_TIMESTAMP = { toSqlString: function() { return 'CURRENT_TIMESTAMP()'; } };

router.get('/update', async function(req, res, next) {

  let response = await getDestiny(`/Destiny2/Manifest/`);

  if (response.ErrorCode === 1) {

    let pathEn = response.Response.jsonWorldContentPaths.en;

    let alreadyUpdated = await fs.promises.access(`./cache/manifest/${path.basename(pathEn)}`)
      .then(() => { return true; })
      .catch((err) => { return false; });

    if (!alreadyUpdated) {
      let manifest = await fetch(`https://www.bungie.net${pathEn}`).then(resp => {
        return resp;
      }).catch(err => {
        console.log(`122`, err.statusCode);
      });

      await fs.promises.writeFile(`./cache/manifest/${path.basename(pathEn)}`, JSON.stringify(manifest), function(err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully Written to File.");
        }
      });

      res.status(200).send({
        ErrorCode: 201,
        Message: 'VOLUSPA',
      });

    } else {
      res.status(200).send({
        ErrorCode: 200,
        Message: 'VOLUSPA'
      });
    }

  } else {
    res.status(500).send({
      ErrorCode: 200,
      Message: 'VOLUSPA',
      Response: response
    });
  }
  
});

module.exports = router;
