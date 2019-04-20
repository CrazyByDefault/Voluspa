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

const values = (response) => {

  let membershipType = response.Response.profile.data.userInfo.membershipType.toString();
  let membershipId = response.Response.profile.data.userInfo.membershipId;
  let displayName = response.Response.profile.data.userInfo.displayName;
  let dateLastPlayed = response.Response.profile.data.dateLastPlayed;

  let characters = Object.values(response.Response.characters.data);

  let timePlayed = Object.keys(response.Response.characters.data).reduce((sum, key) => {
    return sum + parseInt(response.Response.characters.data[key].minutesPlayedTotal);
  }, 0);

  let triumphScore = response.Response.profileRecords.data.score;

  let infamyProgression = Object.values(response.Response.characterProgressions.data)[0].progressions[2772425241].currentProgress;
  let infamyResets = response.Response.profileRecords.data.records[3901785488] ? response.Response.profileRecords.data.records[3901785488].objectives[0].progress : 0;

  let valorProgression = Object.values(response.Response.characterProgressions.data)[0].progressions[3882308435].currentProgress;
  let valorResets = response.Response.profileRecords.data.records[559943871] ? response.Response.profileRecords.data.records[559943871].objectives[0].progress : 0;

  let gloryProgression = Object.values(response.Response.characterProgressions.data)[0].progressions[2679551909].currentProgress;

  return {
    membershipType,
    membershipId,
    displayName,
    dateLastPlayed: new Date(dateLastPlayed),
    characters: JSON.stringify(characters),
    timePlayed,
    triumphScore,
    infamyProgression,
    infamyResets,
    valorProgression,
    valorResets,
    gloryProgression
  }
}

const callBungie = async (membershipType, membershipId, number) => {
  let request = await fetch(`https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,104,200,202,800,900`, {
    "headers":{
      "x-api-key": process.env.BUNGIE_API_KEY
    },
  });
  let response = await request.json();

  return {
    response,
    number
  };
}

const CURRENT_TIMESTAMP = { toSqlString: function() { return 'CURRENT_TIMESTAMP()'; } };

const setState = (isScraping, duration = 0) => {

  if (isScraping === '1') {
    let sql = "UPDATE `status` SET `isScraping` = '1' WHERE `status`.`id` = 1";
    let inserts = [isScraping];
    sql = mysql.format(sql, inserts);

    db.query(sql);
  } else {
    let sql = "UPDATE `status` SET `isScraping` = '0', `lastScraped` = ?, `lastScrapedDuration` = ? WHERE `status`.`id` = 1";
    let inserts = [CURRENT_TIMESTAMP, duration];
    sql = mysql.format(sql, inserts);

    db.query(sql);
  }
}

router.get('/', async function(req, res, next) {

  if (req.headers['x-api-key'] && req.headers['x-api-key'] === process.env.TOKEN) {

    // set status

    setState('1');

    const scrapeStart = new Date().getTime();

    // end set status

    let s = {
      length: 0,
      progress: 0
    };

    let triumphStats = {};
    let memberActual = 0;

    var q = async.queue(async function(task, callback) {
      s.progress++;

      try {
        console.log(`GET:    ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length}`);
        let request = await callBungie(task.membershipType, task.membershipId, s.progress);

        if (request.response.ErrorCode !== 1) {
          console.log(`Bungie: ${task.membershipType}:${task.membershipId} ${request.number}/${s.length} ErrorCode: ${request.response.ErrorCode}`);
        } else {

          if (!request.response.Response.profileRecords.data) {
            console.log(`Error:  ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length} is a private profile`);
            return;
          }

          let store = values(request.response);

          let sql = "UPDATE `members` SET `lastScraped` = ?, `displayName` = ?, `dateLastPlayed` = ?, `timePlayed` = ?, `characters` = ?, `triumphScore` = ?, `infamyResets` = ?, `infamyProgression` = ?, `valorResets` = ?, `valorProgression` = ?, `gloryProgression` = ? WHERE `members`.`membershipType` = ? AND `members`.`membershipId` = ?";
          let inserts = [CURRENT_TIMESTAMP, store.displayName, store.dateLastPlayed, store.timePlayed, store.characters, store.triumphScore, store.infamyResets, store.infamyProgression, store.valorResets, store.valorProgression, store.gloryProgression, task.membershipType, task.membershipId];
          sql = mysql.format(sql, inserts);

          let update = await db.query(sql);
          


          memberActual++;

          //

          for (const [hash, record] of Object.entries(request.response.Response.profileRecords.data.records)) {
            let recordState = enumerateRecordState(record.state);
            if (!recordState.objectiveNotCompleted) {
              if (triumphStats[hash]) {
                triumphStats[hash]++;
              } else {
                triumphStats[hash] = 1;
              }
            }
          }

          let charTemp = {};

          for (const [characterId, character] of Object.entries(request.response.Response.characterRecords.data)) {
            for (const [hash, record] of Object.entries(character.records)) {
              let recordState = enumerateRecordState(record.state);
              if (!recordState.objectiveNotCompleted) {
                if (!charTemp[hash]) {
                  charTemp[hash] = 1;
                }
              }
            }
          }

          for (const [hash, record] of Object.entries(charTemp)) {
            if (triumphStats[hash]) {
              triumphStats[hash]++;
            } else {
              triumphStats[hash] = 1;
            }
          }

          //

          console.log(`OK:     ${task.membershipType}:${task.membershipId} ${request.number}/${s.length}`);
        }

      } catch(e) {
        console.log(`Error:  ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length}`, e);
      }
    }, 10);

    q.drain = function() {
      console.log('q done');

      fs.writeFile('./cache/temp.json', JSON.stringify(triumphStats), function(err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully Written to File.");
        }
      });

      console.log(memberActual);

      for (const [hash, total] of Object.entries(triumphStats)) {
        triumphStats[hash] = (total / memberActual * 100).toFixed(2);
      }

      fs.writeFile('./cache/triumphs.json', JSON.stringify(triumphStats), function(err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully Written to File.");
        }
      });

      
      const scrapeEnd = new Date().getTime();

      // set status

      setState('0', scrapeEnd - scrapeStart);

      // end set status
    }

    let sql = "SELECT `id`, `membershipType`, `membershipId` FROM `members`";
    let inserts = [];
    sql = mysql.format(sql, inserts);

    let members = await db.query(sql);

    s.length = members.length;
    members.forEach(m => {
      q.push(m);
    });

    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA'
    });
  } else {
    console.log(`401 scrape token ${req.headers['x-api-key']}`)
    res.status(401).send({
      ErrorCode: 401,
      Message: 'VOLUSPA'
    });
  }
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

module.exports = router;
