const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');

const router = express.Router();

const db = require('../../db');

const fs = require("fs");
const fsP = fs.promises;

dotenv.config();

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

router.get('/', async function(req, res, next) {

  let lastTuesday = getLastReset();

  let tracking = await db.query("SELECT count(*) AS `count` FROM `members`");
  let public = await db.query("SELECT count(*) AS `count` FROM `members` WHERE `lastScraped` = `lastPublic`");
  let ranked = await db.query("SELECT count(*) as 'count' FROM ranks;");
  let groups = await db.query("SELECT count(DISTINCT(`groupId`)) AS `count` FROM `members`");
  let playedReset = await db.query(mysql.format("SELECT count(*) AS `count` FROM `members` WHERE `lastPlayed` > ?", [lastTuesday]));
  let playedSeason = await db.query("SELECT count(*) AS `count` FROM `members` WHERE `lastPlayed` > '2019-06-04 17:00:00'");
  let status = await db.query("SELECT isScraping, lastScraped, lastScrapedDuration, lastRanked FROM voluspa.status;");

  let statistics = {
    status: status[0],
    tracking: tracking[0].count,
    ranked: ranked[0].count,
    groups: groups[0].count,
    playedReset: playedReset[0].count,
    playedSeason: playedSeason[0].count
  };
  
  let data, general, triumphs, collections, hawthorne;

  // general = await fsP.readFile('./cache/statistics.json');
  // general = JSON.parse(general.toString());
  triumphs = await fsP.readFile('../scraper/cache/triumphs.json');
  triumphs = JSON.parse(triumphs.toString());
  collections = await fsP.readFile('../scraper/cache/collections.json');
  collections = JSON.parse(collections.toString());
  hawthorne = await fsP.readFile('./cache/vendor/3347378076.json');
  hawthorne = JSON.parse(hawthorne.toString());

  let raidBountyIndexes = hawthorne.categories.data.categories.find(d => d.displayCategoryIndex === 6).itemIndexes;
  let raidBountyHashes = Object.values(hawthorne.sales.data).map(item => {
    if (raidBountyIndexes.includes(item.vendorItemIndex)) {
      return item.itemHash;
    } else {
      return false
    }
  }).filter(t => t);

  let memberActual = public[0].count;

  let tempTriumphStats = {};
  for (const [hash, total] of Object.entries(triumphs)) {
    tempTriumphStats[hash] = (total / memberActual * 100).toFixed(2);
  }

  let tempCollectionStats = {};
  for (const [hash, total] of Object.entries(collections)) {
    tempCollectionStats[hash] = (total / memberActual * 100).toFixed(2);
  }

  data = {
    general: statistics,
    triumphs: tempTriumphStats,
    collections: tempCollectionStats,
    bounties: {
      hawthorne: raidBountyHashes
    }
    //groupIds: await "SELECT DISTINCT `groupId` from `members` LIMIT 100000"
  }

  fs.writeFile('./cache/rollup.json', JSON.stringify(data), function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully wrote rolled up statistics to disk");
    }
  });

  res.status(200).send({
    ErrorCode: 1,
    Message: 'VOLUSPA',
    Response: {
      data
    }
  });

});

router.get('/statistics', async function(req, res, next) {

  res.status(200).send({
    ErrorCode: 1,
    Message: 'VOLUSPA',
  });

  let lastTuesday = getLastReset();

  let tracking = await db.query("SELECT count(*) AS `count` FROM `members`");
  let groups = await db.query("SELECT count(DISTINCT(`groupId`)) AS `count` FROM `members`");
  let playedReset = await db.query(mysql.format("SELECT count(*) AS `count` FROM `members` WHERE `lastPlayed` > ?", [lastTuesday]));
  let playedSeason = await db.query("SELECT count(*) AS `count` FROM `members` WHERE `lastPlayed` > '2019-03-05 17:00:00'");
  let status = await db.query("SELECT * FROM voluspa.status;");

  let statistics = {
    status: status[0],
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

});

router.get('/triumphs', async function(req, res, next) {

  res.status(200).send({
    ErrorCode: 1,
    Message: 'VOLUSPA',
  });

  let sql = "SELECT `id`, `triumphRecords` FROM `members`";
  let inserts = [];
  sql = mysql.format(sql, inserts);

  let members = await db.query(sql);

  let triumphStats = {};

  members.forEach(m => {

    let records = JSON.parse(m.triumphRecords) || [];
    records = records.filter(r => !enumerateRecordState(r.state).objectiveNotCompleted);

    records.forEach(r => {
      if (triumphStats[r.hash]) {
        triumphStats[r.hash]++;
      } else {
        triumphStats[r.hash] = 1;
      }
    });

  });

  for (const [hash, total] of Object.entries(triumphStats)) {
    triumphStats[hash] = (total / members.length * 100).toFixed(2);
  }

  fs.writeFile('./cache/triumphs.json', JSON.stringify(triumphStats), function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully wrote Triumph statistics to disk");
    }
  });

});

const flagEnum = (state, value) => !!(state & value);

const enumerateRecordState = state => ({
  none: flagEnum(state, 0),
  recordRedeemed: flagEnum(state, 1),
  rewardUnavailable: flagEnum(state, 2),
  objectiveNotCompleted: flagEnum(state, 4),
  obscured: flagEnum(state, 8),
  invisible: flagEnum(state, 16),
  entitlementUnowned: flagEnum(state, 32),
  canEquipTitle: flagEnum(state, 64)
});

const enumerateCollectibleState = state => ({
  none: flagEnum(state, 0),
  notAcquired: flagEnum(state, 1),
  obscured: flagEnum(state, 2),
  invisible: flagEnum(state, 4),
  cannotAffordMaterialRequirements: flagEnum(state, 8),
  inventorySpaceUnavailable: flagEnum(state, 16),
  uniquenessViolation: flagEnum(state, 32),
  purchaseDisabled: flagEnum(state, 64)
});

module.exports = router;
