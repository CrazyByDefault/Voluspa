const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const async = require('async');

const router = express.Router();

const database = require('../../db');
const db = new database();

const fs = require("fs");

dotenv.config();

const CURRENT_TIMESTAMP = { toSqlString: function() { return 'CURRENT_TIMESTAMP()'; } };

router.post('/store', async function(req, res, next) {
  
  try {
    let sql = "INSERT IGNORE INTO `members` (`id`, `membershipType`, `membershipId`) VALUES (NULL, ?, ?)";
    let inserts = [req.body.membershipType, req.body.membershipId];
    sql = mysql.format(sql, inserts);

    let data = await db.query(sql);

    res.status(200).send({ ErrorCode: 1, Message: 'Hi friend' });
  } catch (e) {
    console.log(e);
  }

});

module.exports = router;
