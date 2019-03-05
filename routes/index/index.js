const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const router = express.Router();

const database = require('../../db');
const db = new database();

dotenv.config();

router.get('/', async function(req, res, next) {

  console.log(req.query)

  let limit = parseInt(req.query.limit, 10) || 10;
  let offset = parseInt(req.query.offset, 10) || 0;
  let sort = req.query.sort || 'triumphScore';

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

module.exports = router;
