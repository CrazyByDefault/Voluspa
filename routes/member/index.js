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

router.post('/rank', async function(req, res, next) {

  let membershipType = req.body.membershipType || false;
  let membershipId = req.body.membershipId || false;

  let sort = req.query.sort || 'triumphScore';

  try {
    let sql = "SELECT `membershipType`, `membershipId`, `displayName`, `triumphScore`, `rank` FROM (SELECT `id`, `displayName`, `triumphScore`, `membershipType`, `membershipId`, DENSE_RANK() OVER (ORDER BY `triumphScore` DESC) `rank` FROM `members` ORDER BY `rank` ASC) `R` WHERE `R`.`membershipType` = ? AND `R`.`membershipId` = ?";
    let inserts = [membershipType, membershipId];
    sql = mysql.format(sql, inserts);

    let data = await db.query(sql);

    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA',
      Response: {
        data
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
});

module.exports = router;
