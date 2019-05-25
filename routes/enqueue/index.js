const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');

const router = express.Router();

const db = require('../../db');

dotenv.config();

const CURRENT_TIMESTAMP = { toSqlString: function() { return 'CURRENT_TIMESTAMP()'; } };

router.post('/store', async function(req, res, next) {

  if (req.body.groupId) {
    try {
      let sql = "INSERT IGNORE INTO `groups` (`id`, `groupId`) VALUES (NULL, ?)";
      let inserts = [req.body.groupId];
      sql = mysql.format(sql, inserts);
  
      let data = await db.query(sql);
  
      res.status(200).send({ ErrorCode: 1, Message: 'VOLUSPA' });
    } catch (e) {
      console.log(e);
    }
  } else {
    try {
      let sql = "INSERT IGNORE INTO `members` (`id`, `membershipType`, `membershipId`) VALUES (NULL, ?, ?)";
      let inserts = [req.body.membershipType, req.body.membershipId];
      sql = mysql.format(sql, inserts);
  
      let data = await db.query(sql);
  
      res.status(200).send({ ErrorCode: 1, Message: 'VOLUSPA' });
    } catch (e) {
      console.log(e);
    }
  }

});

module.exports = router;
