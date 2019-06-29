const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const async = require('async');

const { httpGet } = require('../../http');

const router = express.Router();

const db = require('../../db');


const fs = require('fs');
const fsP = fs.promises;

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

      let tokens = await fsP.readFile('./cache/tokens.json');
      tokens = JSON.parse(tokens.toString());

      let now = new Date().getTime() + 10000;
      let then = new Date(tokens.access_token.expires_in);

      let accessToken = tokens.access_token.value;

      if (now > then) {
        let response = await getDestiny(`/App/OAuth/Token/`, {
          useAuthorization: true
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

  return httpGet(url, opts).then(resp => {
    return resp;
  }).catch(err => {
    
  });
}

const CURRENT_TIMESTAMP = { toSqlString: function() { return 'CURRENT_TIMESTAMP()'; } };

router.get('/', async function(req, res, next) {
  const vendorHash = req.query.hash || '2190858386';

  let tokens = await fsP.readFile('./cache/tokens.json');
      tokens = JSON.parse(tokens.toString());

  if (tokens) {
    let response = await getDestiny(`/Destiny2/1/Profile/4611686018449662397/Character/2305843009260574394/Vendors/${vendorHash}/?components=300,301,302,304,305,400,401,402`, { useAccessToken: true });

    if (response.ErrorCode === 1) {

      let instances = {
        categories: response.Response.categories,
        itemComponents: response.Response.itemComponents,
        sales: response.Response.sales,
        vendor: response.Response.vendor
      }

      fs.writeFile(`./cache/vendor/${vendorHash}.json`, JSON.stringify(instances), function(err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully Written to File.");
        }
      });

      res.status(200).send({
        ErrorCode: 1,
        Message: 'VOLUSPA',
        Response: instances
      });
      
    } else {
      res.status(500).send({
        ErrorCode: response.ErrorCode,
        Message: 'VOLUSPA',
        Response: response
      });
    }
  } else {
    res.status(500).send({
      ErrorCode: 500,
      Message: 'VOLUSPA'
    });
  }
});

module.exports = router;
