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

const callBungie = async (membershipType, membershipId, number) => {
  let request = await fetch(`https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=900`, {
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

router.get('/', async function(req, res, next) {

  let results = {};

  if (req.headers['x-api-key'] && req.headers['x-api-key'] === process.env.TOKEN) {

    let s = {
      length: 0,
      progress: 0
    };

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

          for (const [hash, record] of Object.entries(request.response.Response.profileRecords.data.records)) {
            let recordState = enumerateRecordState(record.state);
            if (!recordState.objectiveNotCompleted) {
              if (results[hash]) {
                results[hash]++;
              } else {
                results[hash] = 1;
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
            if (results[hash]) {
              results[hash]++;
            } else {
              results[hash] = 1;
            }
          }

          console.log(`OK:     ${task.membershipType}:${task.membershipId} ${request.number}/${s.length}`);
        }

      } catch(e) {
        console.log(`Error:  ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length}`, e);
      }
    }, 5);

    q.drain = function() {
      console.log('q done');

      fs.writeFile("results.json", JSON.stringify({ complete: { results } }), function(err, data) {
        if (err) console.log(err);
        console.log("Successfully Written to File.");
      });
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
