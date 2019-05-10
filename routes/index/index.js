const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const router = express.Router();

const database = require('../../db');
const db = new database();

dotenv.config();

router.get('/', async function(req, res, next) {

  

  


  res.status(200).send({
    ErrorCode: 1,
    Message: 'VOLUSPA'
  });

});

module.exports = router;
