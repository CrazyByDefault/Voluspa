const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const fetch = require('node-fetch');
const async = require('async');

const router = express.Router();

const db = require('../../db');


const fs = require("fs");

dotenv.config();

router.get('/', async function(req, res, next) {

  

  res.status(200).send({
    ErrorCode: 1,
    Message: 'VOLUSPA'
  });
});

module.exports = router;
