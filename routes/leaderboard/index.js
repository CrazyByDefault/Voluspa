const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const router = express.Router();

const database = require('../../db');
const db = new database();

dotenv.config();

router.get('/triumphScore', async function(req, res, next) {

  console.log(req.query)

  let limit = parseInt(req.query.limit, 10) || 10;
  let offset = parseInt(req.query.offset, 10) || 0;
  let sort = req.query.sort || 'triumphScore';
  
  let membershipType = req.query.membershipType || false;
  let membershipId = req.query.membershipId || false;

  try {
    let sql = "SELECT * FROM (SELECT *, DENSE_RANK() OVER (ORDER BY `triumphScore` DESC) `rank` FROM `members` ORDER BY `rank` ASC, `displayName` ASC) `R` LIMIT ? OFFSET ?";
    let inserts = [limit, offset];
    sql = mysql.format(sql, inserts);

    let results = await db.query(sql);

    let data = results.map((p, i) => {
      return {
        destinyUserInfo: {
          membershipType: p.membershipType,
          membershipId: p.membershipId,
          displayName: p.displayName,
          dateLastPlayed: p.dateLastPlayed
        },
        characters: JSON.parse(p.characters),
        timePlayed: p.timePlayed,
        triumphScore: p.triumphScore,
        progression: {
          infamyProgression: p.infamyProgression,
          infamyResets: p.infamyResets,
          valorProgression: p.valorProgression,
          valorResets: p.valorResets,
          gloryProgression: p.gloryProgression
        },
        rank: p.rank
      }
    });


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

const CURRENT_TIMESTAMP = { toSqlString: function() { return 'CURRENT_TIMESTAMP()'; } };

router.get('/summary', async function(req, res, next) {

  try {
    let sql = "SELECT COUNT(`id`) as `tracking` FROM `members` WHERE `lastScraped` > ? - 86400000";
    let inserts = [CURRENT_TIMESTAMP];
    sql = mysql.format(sql, inserts);

    let result = await db.query(sql);
    result = result[0];

    // let data = results.map((p, i) => {
    //   return {
    //     destinyUserInfo: {
    //       membershipType: p.membershipType,
    //       membershipId: p.membershipId,
    //       displayName: p.displayName,
    //       dateLastPlayed: p.dateLastPlayed
    //     },
    //     characters: JSON.parse(p.characters),
    //     timePlayed: p.timePlayed,
    //     triumphScore: p.triumphScore,
    //     progression: {
    //       infamyProgression: p.infamyProgression,
    //       infamyResets: p.infamyResets,
    //       valorProgression: p.valorProgression,
    //       valorResets: p.valorResets,
    //       gloryProgression: p.gloryProgression
    //     },
    //     rank: p.rank
    //   }
    // });
    
  
    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA',
      Response: {
        data: result
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
