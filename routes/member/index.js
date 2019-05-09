const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const fetch = require('node-fetch');
const async = require('async');

const router = express.Router();

const database = require('../../db');
const db = new database();

const fs = require("fs");

dotenv.config();

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

router.get('/rank', async function(req, res, next) {

  let membershipType = req.query.membershipType || false;
  let membershipId = req.query.membershipId || false;
  let groupId = req.query.groupId || false;

  let sort = req.query.sort || 'triumphScore';

  if (membershipType && membershipId) {

    try {
      let sql = "SELECT `membershipType`, `membershipId`, `displayName`, `triumphScore`, `rank`, `lastScraped`, `lastPublic` FROM (SELECT `id`, `displayName`, `triumphScore`, `membershipType`, `membershipId`, `lastScraped`, `lastPublic`, DENSE_RANK() OVER (ORDER BY `triumphScore` DESC) `rank` FROM `members` ORDER BY `rank` ASC) `R` WHERE `R`.`membershipType` = ? AND `R`.`membershipId` = ?";
      let inserts = [membershipType, membershipId];
      sql = mysql.format(sql, inserts);

      let data = await db.query(sql);

      if (data.length !== 1) {
        res.status(200).send({
          ErrorCode: 18,
          ErrorStatus: "UnindexedMember",
          Message: "The requested member hasn't been indexed before."
        });

        return;
      }

      data = data[0];

      if (!data.lastScraped) {
        res.status(200).send({
          ErrorCode: 18,
          ErrorStatus: "UnindexedMember",
          Message: "The requested member hasn't been indexed before."
        });

        return;
      }

      res.status(200).send({
        ErrorCode: 1,
        Message: 'VOLUSPA',
        Response: {
          lastScraped: data.lastScraped,
          lastPublic: data.lastPublic,
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
  } else if (groupId) {

    let sql = "SELECT `membershipType`, `membershipId`, `displayName`, `triumphScore`, `rank`, `lastScraped`, `lastPublic` FROM (SELECT `id`, `displayName`, `triumphScore`, `membershipType`, `membershipId`, `lastScraped`, `lastPublic`, `groupId`, DENSE_RANK() OVER (ORDER BY `triumphScore` DESC) `rank` FROM `members` ORDER BY `rank` ASC) `R` WHERE `R`.`groupId` = ?";
    let inserts = [groupId];
    sql = mysql.format(sql, inserts);

    let data = await db.query(sql);

    let response = data.map(d=> {
      return {
        lastScraped: d.lastScraped,
        lastPublic: d.lastPublic,
        destinyUserInfo: {
          membershipType: d.membershipType,
          membershipId: d.membershipId,
          displayName: d.displayName
        },
        triumphScore: d.triumphScore,
        rank: d.rank
      }
    });
    
    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA',
      Response: response
    });

  } else {
    res.status(200).send({
      ErrorCode: 18,
      ErrorStatus: "InvalidParameters",
      Message: "The input parameters were invalid, please enter valid input, and try again."
    });
  }

});

module.exports = router;
