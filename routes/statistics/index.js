const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const async = require('async');

const router = express.Router();

const db = require('../../db');


const fs = require("fs");
const fsP = fs.promises;

dotenv.config();

router.get('/', async function(req, res, next) {

  fs.readFile('./cache/rollup.json', function(err, buf) {
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
        Response: {
          data: json
        }
      });
    }
  });

});

router.get('/triumphs', async function(req, res, next) {

  fs.readFile('./cache/triumphs.json', function(err, buf) {
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
        Response: {
          data: json
        }
      });
    }
  });

});

module.exports = router;
