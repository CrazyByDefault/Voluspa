const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const async = require('async');

const router = express.Router();

const database = require('../../db');
const db = new database();

const fs = require("fs");

dotenv.config();

router.get('/', async function(req, res, next) {

  res.status(200).send({
    ErrorCode: 1,
    Message: 'VOLUSPA'
  });

});

function getLastReset() {
  var d = new Date(),
      day = d.getDay(),
      diff = (day <= 2) ? (7 - 2 + day ) : (day - 2);

  d.setDate(d.getDate() - diff);
  d.setHours(17);
  d.setMinutes(0);
  d.setSeconds(0);

  return d.toISOString().split('T')[0]+' '+d.toTimeString().split(' ')[0];
}

router.get('/statistics', async function(req, res, next) {

  let lastTuesday = getLastReset();

  let tracking = await db.query("SELECT count(*) AS `count` FROM `members`");
  let groups = await db.query("SELECT count(DISTINCT(`groupId`)) AS `count` FROM `members`");
  let playedReset = await db.query(mysql.format("SELECT count(*) AS `count` FROM `members` WHERE `dateLastPlayed` > ?", [lastTuesday]));
  let playedSeason = await db.query("SELECT count(*) AS `count` FROM `members` WHERE `dateLastPlayed` > '2019-03-05 17:00:00'");

  let statistics = {
    tracking: tracking[0].count,
    groups: groups[0].count,
    playedReset: playedReset[0].count,
    playedSeason: playedSeason[0].count
  };

  fs.writeFile('./cache/statistics.json', JSON.stringify(statistics), function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully wrote statistics to disk");
    }
  });

  res.status(200).send({
    ErrorCode: 1,
    Message: 'VOLUSPA',
    Response: {
      statistics
    }
  });

});

module.exports = router;
