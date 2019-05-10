const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const async = require('async');
const qrate = require('qrate');

const chalk = require('chalk');

const { httpGet } = require('../../http');

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

  let dateTest = new Date(dateLastPlayed).getTime();
  if (dateTest < 10000) {
    dateLastPlayed = null;
  }

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
    dateLastPlayed: !dateLastPlayed ? null : new Date(dateLastPlayed),
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

function getDestiny(pathname, opts = {}, postBody) {
  const hostname = opts.useStatsEndpoint
    ? `https://stats.bungie.net`
    : 'https://www.bungie.net';

  let url = `${hostname}/Platform${pathname}`;
  url = url.replace('/Platform/Platform/', '/Platform/');

  opts.headers = opts.headers || {};
  opts.headers['x-api-key'] = process.env.BUNGIE_API_KEY;

  if (opts.accessToken) {
    opts.headers['Authorization'] = `Bearer ${opts.accessToken}`;
  }

  if (postBody) {
    opts.method = 'POST';
    if (typeof postBody === 'string') {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.body = postBody;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(postBody);
    }
  }

  return httpGet(url, opts).then(resp => {
    // if (resp.ErrorStatus === 'DestinyAccountNotFound') {
    //   return null;
    // }

    // if (has(resp, 'ErrorCode') && resp.ErrorCode !== 1) {
    //   // const cleanedUrl = url.replace(/\/\d+\//g, '/_/');
    //   const err = new Error(
    //     'Bungie API Error ' +
    //       resp.ErrorStatus +
    //       ' - ' +
    //       resp.Message +
    //       '\nURL: ' +
    //       url
    //   );

    //   err.data = resp;
    //   throw err;
    // }

    // const result = resp.Response || resp;



    return resp;
  });
}

const getProfile = async (membershipType, membershipId, number) => {
  
  let response = await getDestiny(`/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,104,200,202,800,900`);

  return {
    response,
    number
  };
}

const getGroupMembers = async (groupId, number) => {
  let response = await getDestiny(`/GroupV2/${groupId}/Members/`);

  return {
    response,
    number
  };
}

const getMemberGroups = async (membershipType, membershipId) => {
  let response = await getDestiny(`/GroupV2/User/${membershipType}/${membershipId}/0/1/`);

  return response;
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

const updateRanksTable = async data => {

  const worker = async function(task, done) {

    let sql = "INSERT INTO `ranks` (`memberId`,`triumphScoreRank`) VALUES ((SELECT `id` FROM `members` WHERE `membershipType` = ? AND `membershipId` = ?), ?) ON DUPLICATE KEY UPDATE `triumphScoreRank` = ?";
    let inserts = [task.membershipType, task.membershipId, task.triumphScoreRank, task.triumphScoreRank];
    sql = mysql.format(sql, inserts);

    let inserted = await db.query(sql);

  }

  const q = qrate(worker, 100);

  q.drain = async function() {
console.log('ranks done.')
    q.kill();
  }
  
  data.forEach(m => {
    q.push(m);
  });

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
    let triumphScores = [];
    let memberActual = 0;

    const worker = async function(task, done) {

      // console.log('Processing', '@', new Date().getTime() - scrapeStart, 'ms');

      s.progress++;

      try {
        // console.log(`GET:    ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length}`);

        let [profile, groups] = await Promise.all([getProfile(task.membershipType, task.membershipId, s.progress), getMemberGroups(task.membershipType, task.membershipId)]);
        
        if (profile.response.ErrorCode !== 1) {
          if (profile.response.ErrorCode === 1601) {
            return;
          }
          console.log(`Bungie: ${task.membershipType}:${task.membershipId} ${profile.number}/${s.length} ErrorCode: ${profile.response.ErrorCode}`);
        } else {

          let groupId = null;
          if (groups.ErrorCode === 1 && groups.Response.results.length > 0) {
            groupId = groups.Response.results[0].group.groupId;
          }

          if (!profile.response.Response.profileRecords.data) {
            // console.log(`Error:  ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length} is a private profile`);

            let displayName = null;
            let dateLastPlayed = null;
            try {
              displayName = response.Response.profile.data.userInfo.displayName;
              dateLastPlayed = response.Response.profile.data.dateLastPlayed;
            } catch (e) {

            }

            let dateTest = new Date(dateLastPlayed).getTime();
            if (dateTest < 10000) {
              dateLastPlayed = null;
            }
            
            let sql = "UPDATE `members` SET `lastScraped` = ?, `displayName` = COALESCE(?, displayName), `dateLastPlayed` = COALESCE(?, dateLastPlayed), `groupId` = COALESCE(?, groupId) WHERE `members`.`membershipType` = ? AND `members`.`membershipId` = ?";
            let inserts = [CURRENT_TIMESTAMP, displayName, dateLastPlayed, groupId, task.membershipType, task.membershipId];
            sql = mysql.format(sql, inserts);
  
            let update = await db.query(sql);

            return;
          }

          let store = values(profile.response);

          let sql = "UPDATE `members` SET `lastScraped` = ?, `lastPublic` = ?, `displayName` = ?, `dateLastPlayed` = ?, `timePlayed` = ?, `characters` = ?, `triumphScore` = ?, `infamyResets` = ?, `infamyProgression` = ?, `valorResets` = ?, `valorProgression` = ?, `gloryProgression` = ?, `groupId` = COALESCE(?, groupId) WHERE `members`.`membershipType` = ? AND `members`.`membershipId` = ?";
          let inserts = [CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, store.displayName, store.dateLastPlayed, store.timePlayed, store.characters, store.triumphScore, store.infamyResets, store.infamyProgression, store.valorResets, store.valorProgression, store.gloryProgression, groupId, task.membershipType, task.membershipId];
          sql = mysql.format(sql, inserts);

          let update = await db.query(sql);
          


          memberActual++;



          triumphScores.push({
            membershipType: task.membershipType,
            membershipId: task.membershipId,
            score: profile.response.Response.profileRecords.data.score
          });

          //

          for (const [hash, record] of Object.entries(profile.response.Response.profileRecords.data.records)) {
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

          for (const [characterId, character] of Object.entries(profile.response.Response.characterRecords.data)) {
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

          // console.log(`OK:     ${task.membershipType}:${task.membershipId} ${profile.number}/${s.length}`);
        }

      } catch(e) {
        console.log(`Error:  ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length}`, e);
      }



    }

    const q = qrate(worker, 77, 77);

    q.drain = async function() {
      // console.log('q done');

      // fs.writeFile('./cache/temp.json', JSON.stringify(triumphStats), function(err, data) {
      //   if (err) {
      //     console.log(err);
      //   } else {
      //     console.log("Successfully Written to File.");
      //   }
      // });

      // console.log(memberActual);

      for (const [hash, total] of Object.entries(triumphStats)) {
        triumphStats[hash] = (total / memberActual * 100).toFixed(2);
      }

      fs.writeFile('./cache/triumphs.json', JSON.stringify(triumphStats), function(err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully wrote Triumph stats to disk");
        }
      });

      let sortedTriumphScores = triumphScores.sort((a, b) => (a.score > b.score) ? 1 : -1);

      let rankedTriumphScores = sortedTriumphScores;
      sortedTriumphScores.forEach((s, i) => {
        rankedTriumphScores[i].triumphScoreRank = i;
      });

      await updateRanksTable(rankedTriumphScores);


      
      const scrapeEnd = new Date().getTime();

      // set status

      setState('0', scrapeEnd - scrapeStart);

      // end set status

      clearInterval(intervalTimer);

      q.kill();
    }

    let sql = "SELECT `id`, `membershipType`, `membershipId` FROM `members`";
    let inserts = [];
    sql = mysql.format(sql, inserts);

    let members = await db.query(sql);

    s.length = members.length;
    members.forEach(m => {
      q.push(m);
    });

    function progressInterval() {
      console.log(chalk.inverse(`${(s.progress/s.length*100).toFixed(3)}% [${s.progress.toString().padStart(6,'0')}] of ${s.length} - ${Math.floor((new Date().getTime() - scrapeStart) / 60000)}m elapsed`));
    }
    
    const intervalTimer = setInterval(progressInterval, 60000);

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

router.get('/groups', async function(req, res, next) {

  if (req.headers['x-api-key'] && req.headers['x-api-key'] === process.env.TOKEN) {

    // set status

    setState('1');

    const scrapeStart = new Date().getTime();

    // end set status

    let s = {
      length: 0,
      progress: 0
    };

    let groupsActual = 0;

    let q = async.queue(async function(task, callback) {
      console.log(task);
      s.progress++;

      try {
        console.log(`GET:    ${task.groupId} ${s.progress}/${s.length}`);

        let groupMembers = await getGroupMembers(task.groupId, s.progress);

        if (groupMembers.response.ErrorCode !== 1) {
          console.log(`Bungie: ${task.groupId} ${groupMembers.numbers}/${s.length} ErrorCode: ${groupMembers.response.ErrorCode}`);
        } else {

          let members = groupMembers.response.Response.results || [];
          members = members.map(g => [g.destinyUserInfo.membershipType, g.destinyUserInfo.membershipId, g.destinyUserInfo.displayName, task.groupId]);

          let sql = "INSERT IGNORE INTO `members` (`membershipType`, `membershipId`, `displayName`, `groupId`) VALUES ?";
          let inserts = [members];
          sql = mysql.format(sql, inserts);

          let inserted = await db.query(sql);

          console.log(inserted.changedRows);

          groupsActual++;

          

          console.log(`OK:     ${task.groupId} ${groupMembers.number}/${s.length}`);
        }

      } catch(e) {
        console.log(`Error:  ${task.groupId} ${s.progress}/${s.length}`, e);
      }
    }, 10);

    q.drain = function() {
      console.log('q done');
      console.log(groupsActual);
      console.log(s);
      
      const scrapeEnd = new Date().getTime();

      // set status

      setState('0', scrapeEnd - scrapeStart);

      // end set status
    }

    let sql = "SELECT DISTINCT `groupId` FROM `members`";
    let inserts = [];
    sql = mysql.format(sql, inserts);

    let groups = await db.query(sql);

    s.length = groups.length;
    groups.forEach(g => {
      q.push(g);
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
