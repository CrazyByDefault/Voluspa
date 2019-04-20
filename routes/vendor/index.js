const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const fetch = require('node-fetch');
const async = require('async');

const router = express.Router();

const database = require('../../db');
const db = new database();

const fs = require('fs');
const fsP = fs.promises;

dotenv.config();

router.get('/', async function(req, res, next) {
  const vendorHash = req.query.vendor || '2190858386';

  let tokens = await fsP.readFile('./cache/tokens.json');
      tokens = JSON.parse(tokens.toString());

  if (tokens) {
    //const apiKey = 'c148b45f6eda40c8b707b5a8cf848e40';

    let request = await fetch(`https://www.bungie.net/Platform/Destiny2/1/Profile/4611686018449662397/Character/2305843009260574394/Vendors/${vendorHash}/?components=300,301,302,304,305,400,401,402`, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${tokens.access_token.value}`,
        'X-API-KEY': process.env.BUNGIE_API_KEY
      }
    });
    let response = await request.json();

    if (response.ErrorCode === 1) {


      res.status(200).send({
        ErrorCode: 1,
        Message: 'VOLUSPA',
        Response: response
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
