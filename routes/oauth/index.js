const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const fetch = require('node-fetch');
const async = require('async');

const router = express.Router();

const database = require('../../db');
const db = new database();

const fs = require('fs');

dotenv.config();

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
  const clientId = '26441';

  res.writeHead(302, { Location: `https://www.bungie.net/en/OAuth/Authorize?client_id=${clientId}&response_type=code` });
  return res.end();
});

router.get('/callback', async function(req, res, next) {
  const apiKey = 'c148b45f6eda40c8b707b5a8cf848e40';
  const clientId = '26441';
  const clientSecret = 'ovZX00LmAFkUTh9MTBtIS2BLvtrLSFxUdY4E59OHnU0';
  const code = req.query.code;
  //const current_time = time();

  let request = await fetch(`https://www.bungie.net/Platform/App/OAuth/Token/`, {
    method: 'post',
    body: `grant_type=authorization_code&code=${code}`,
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'X-API-KEY': process.env.BUNGIE_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  let response = await request.json();

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
