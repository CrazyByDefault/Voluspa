const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const fetch = require('node-fetch');
const async = require('async');

const router = express.Router();

const database = require('../../db');
const db = new database();

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

const setState = (isScraping) => {
  let sql = "UPDATE `status` SET `isScraping` = ? WHERE `status`.`id` = 1";
  let inserts = [isScraping];
  sql = mysql.format(sql, inserts);

  db.query(sql);
}

router.get('/', async function(req, res, next) {

  if (req.headers['x-api-key'] && req.headers['x-api-key'] === process.env.TOKEN) {

    // set status

    setState(1);

    // end set status

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

          let store = values(request.response);

          let sql = "UPDATE `members` SET `displayName` = ?, `dateLastPlayed` = ?, `timePlayed` = ?, `characters` = ?, `triumphScore` = ?, `infamyResets` = ?, `infamyProgression` = ?, `valorResets` = ?, `valorProgression` = ?, `gloryProgression` = ? WHERE `members`.`membershipType` = ? AND `members`.`membershipId` = ?";
          let inserts = [store.displayName, store.dateLastPlayed, store.timePlayed, store.characters, store.triumphScore, store.infamyResets, store.infamyProgression, store.valorResets, store.valorProgression, store.gloryProgression, task.membershipType, task.membershipId];
          sql = mysql.format(sql, inserts);

          let update = await db.query(sql);
    
          console.log(`OK:     ${task.membershipType}:${task.membershipId} ${request.number}/${s.length}`);
        }

      } catch(e) {
        console.log(`Error:  ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length}`, e);
      }
    }, 7);

    q.drain = function() {
      console.log('q done');

      // set status

      setState(0);

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

module.exports = router;
