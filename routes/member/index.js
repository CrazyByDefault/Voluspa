const express = require('express');
const mysql = require('mysql');
const router = express.Router();

const database = require('../../db');
const db = new database();

router.post('/store', async function(req, res, next) {

  try {
    let sql = "SELECT * FROM members WHERE `membershipType` = ? AND `membershipId` = ?";
    let inserts = [req.body.membershipType, req.body.membershipId];
    sql = mysql.format(sql, inserts);

    let existingMembers = await db.query(sql);

    if (existingMembers.length === 0) {
      let sql = "INSERT INTO `members` (`id`, `membershipType`, `membershipId`) VALUES (NULL, ?, ?)";
      let inserts = [req.body.membershipType, req.body.membershipId];
      sql = mysql.format(sql, inserts);

      let addMember = await db.query(sql);

      res.status(200).send({ Message: 'Hi friend' });
      return;

    } else {
      res.status(200).send({ Message: 'Welcome back' });
      return;
    }  
  } catch (e) {
    console.log(e);
  }

});

router.get('/rank', async function(req, res, next) {

  let membershipType = req.query.membershipType || false;
  let membershipId = req.query.membershipId || false;

  let sort = req.query.sort || 'triumphScore';

  if (membershipType && membershipId) {

    try {
      let sql = "SELECT `membershipType`, `membershipId`, `displayName`, `triumphScore`, `rank` FROM (SELECT `id`, `displayName`, `triumphScore`, `membershipType`, `membershipId`, DENSE_RANK() OVER (ORDER BY `triumphScore` DESC) `rank` FROM `members` ORDER BY `rank` ASC) `R` WHERE `R`.`membershipType` = ? AND `R`.`membershipId` = ?";
      let inserts = [membershipType, membershipId];
      sql = mysql.format(sql, inserts);

      let data = await db.query(sql);
      data = data[0];

      res.status(200).send({
        ErrorCode: 1,
        Message: 'VOLUSPA',
        Response: {
          destinyUserInfo: {
            membershipType: data.membershipType,
            membershipId: data.membershipId,
            displayName: data.displayName
          },
          triumphScore: data.triumphScore,
          rank: data.rank
        }
      });
    } catch (e) {
      console.error(e);

      res.status(200).send({
        ErrorCode: 500,
        Message: 'VOLUSPA',
        Response: e
      });
    }
  } else {
    res.status(200).send({
      ErrorCode: 18,
      ErrorStatus: "InvalidParameters",
      Message: "The input parameters were invalid, please enter valid input, and try again."
    });
  }

});

module.exports = router;
