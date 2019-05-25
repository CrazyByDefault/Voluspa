const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const async = require('async');
const qrate = require('qrate');

const chalk = require('chalk');

const { httpGet } = require('../../http');

const router = express.Router();

const db = require('../../db');


const fs = require('fs');

dotenv.config();

const values = async response => {
  let membershipType = response.Response.profile.data.userInfo.membershipType.toString();
  let membershipId = response.Response.profile.data.userInfo.membershipId;
  let displayName = response.Response.profile.data.userInfo.displayName;
  let lastPlayed = response.Response.profile.data.dateLastPlayed;

  let dateTest = new Date(lastPlayed).getTime();
  if (dateTest < 10000) {
    lastPlayed = null;
  }

  let timePlayed = Object.keys(response.Response.characters.data).reduce((sum, key) => {
    return sum + parseInt(response.Response.characters.data[key].minutesPlayedTotal);
  }, 0);

  let triumphScore = response.Response.profileRecords.data.score;

  let collectionTotal = 0;
  let profileTempCollections = {};

  for (const [hash, collectible] of Object.entries(response.Response.profileCollectibles.data.collectibles)) {
    let collectibleState = enumerateCollectibleState(collectible.state);
    if (!collectibleState.notAcquired) {
      if (!profileTempCollections[hash]) {
        profileTempCollections[hash] = 1;
      }
    }
  }

  for (const [characterId, character] of Object.entries(response.Response.characterCollectibles.data)) {
    for (const [hash, collectible] of Object.entries(character.collectibles)) {
      let collectibleState = enumerateCollectibleState(collectible.state);
      if (!collectibleState.notAcquired) {
        if (!profileTempCollections[hash]) {
          profileTempCollections[hash] = 1;
        }
      }
    }
  }

  for (const [hash, collectible] of Object.entries(profileTempCollections)) {
    collectionTotal++;
  }

  let progressionInfamy = Object.values(response.Response.characterProgressions.data)[0].progressions[2772425241].currentProgress;
  let progressionInfamyResets = response.Response.profileRecords.data.records[3901785488] ? response.Response.profileRecords.data.records[3901785488].objectives[0].progress : 0;

  let progressionValor = Object.values(response.Response.characterProgressions.data)[0].progressions[3882308435].currentProgress;
  let progressionValorResets = response.Response.profileRecords.data.records[559943871] ? response.Response.profileRecords.data.records[559943871].objectives[0].progress : 0;

  let progressionGlory = Object.values(response.Response.characterProgressions.data)[0].progressions[2679551909].currentProgress;

  let sealRivensbane = response.Response.profileRecords.data.records[2182090828].objectives[0].progress === response.Response.profileRecords.data.records[2182090828].objectives[0].completionValue ? true : false;
  let sealCursebreaker = response.Response.profileRecords.data.records[1693645129].objectives[0].progress === response.Response.profileRecords.data.records[1693645129].objectives[0].completionValue ? true : false;
  let sealChronicler = response.Response.profileRecords.data.records[1754983323].objectives[0].progress === response.Response.profileRecords.data.records[1754983323].objectives[0].completionValue ? true : false;
  let sealUnbroken = response.Response.profileRecords.data.records[3369119720].objectives[0].progress === response.Response.profileRecords.data.records[3369119720].objectives[0].completionValue ? true : false;
  let sealDredgen = response.Response.profileRecords.data.records[3798931976].objectives[0].progress === response.Response.profileRecords.data.records[3798931976].objectives[0].completionValue ? true : false;
  let sealWayfarer = response.Response.profileRecords.data.records[2757681677].objectives[0].progress === response.Response.profileRecords.data.records[2757681677].objectives[0].completionValue ? true : false;
  let sealBlacksmith = response.Response.profileRecords.data.records[2053985130].objectives[0].progress === response.Response.profileRecords.data.records[2053985130].objectives[0].completionValue ? true : false;
  let sealReckoner = response.Response.profileRecords.data.records[1313291220].objectives[0].progress === response.Response.profileRecords.data.records[1313291220].objectives[0].completionValue ? true : false;

  return {
    membershipType,
    membershipId,
    displayName,
    lastPlayed: !lastPlayed ? null : new Date(lastPlayed),
    timePlayed,
    triumphScore,
    collectionTotal,
    progressionInfamy,
    progressionInfamyResets,
    progressionValor,
    progressionValorResets,
    progressionGlory,
    sealRivensbane,
    sealCursebreaker,
    sealChronicler,
    sealUnbroken,
    sealDredgen,
    sealWayfarer,
    sealBlacksmith,
    sealReckoner
  };
};

function getDestiny(pathname, opts = {}, postBody) {
  const hostname = opts.useStatsEndpoint ? `https://stats.bungie.net` : 'https://www.bungie.net';

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

  return httpGet(url, opts);
}

const getProfile = async (membershipType, membershipId, number) => {
  const requestStart = new Date().getTime();
  let response = await getDestiny(`/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,104,200,202,800,900`);

  return {
    response,
    number,
    time: `${new Date().getTime() - requestStart}ms`
  };
};

const getGroupMembers = async (groupId, number) => {
  const requestStart = new Date().getTime();
  let response = await getDestiny(`/GroupV2/${groupId}/Members/`);

  return {
    response,
    number,
    time: `${new Date().getTime() - requestStart}ms`
  };
};

const getMemberGroups = async (membershipType, membershipId) => {
  let response = await getDestiny(`/GroupV2/User/${membershipType}/${membershipId}/0/1/`);

  return response;
};

const CURRENT_TIMESTAMP = {
  toSqlString: function() {
    return 'CURRENT_TIMESTAMP()';
  }
};

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
};

router.get('/', async function(req, res, next) {
  if (req.headers['x-api-key'] && req.headers['x-api-key'] === process.env.TOKEN) {

    let minimalScrape = req.query.minimal || false;
    let skipStats = req.query.skipStats || false;

    // set status

    setState('1');

    const scrapeStart = new Date().getTime();

    // end set status

    let s = {
      length: 0,
      progress: 0
    };

    let memberActual = 0;
    let triumphStats = {};
    let collectionStats = {};

    const worker = async function(task, done) {
      // console.log('Processing', '@', new Date().getTime() - scrapeStart, 'ms');

      s.progress++;

      try {
        // console.log(`GET:    ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length}`, new Date().getTime() - scrapeStart, 'ms');

        let [profile, groups] = await Promise.all([getProfile(task.membershipType, task.membershipId, s.progress), getMemberGroups(task.membershipType, task.membershipId)]);

        if (profile.response.ErrorCode !== 1) {
          // if (profile.response.ErrorCode === 1601) {
          //   return;
          // }

          console.log(`Bungie: ${task.displayName.toString().padStart(20, ' ')} [${task.membershipType}:${task.membershipId}] ${profile.number}/${s.length} ErrorCode: ${profile.response.ErrorCode}`);
        } else {
          let groupId = null;
          if (groups.ErrorCode === 1 && groups.Response.results.length > 0) {
            groupId = groups.Response.results[0].group.groupId;
          }

          if (!profile.response.Response.characterProgressions.data) {

            console.log(`Error:  ${task.displayName.toString().padStart(20, ' ')} [${task.membershipType}:${task.membershipId}] ${s.progress}/${s.length} is a private profile`);

            let displayName = null;
            let lastPlayed = null;
            try {
              displayName = response.Response.profile.data.userInfo.displayName;
              lastPlayed = response.Response.profile.data.dateLastPlayed;
            } catch (e) {}

            let dateTest = new Date(lastPlayed).getTime();
            if (dateTest < 10000) {
              lastPlayed = null;
            }
           
            let sql = 'UPDATE `members` SET `displayName` = COALESCE(?, displayName), `groupId` = COALESCE(?, groupId), `lastScraped` = ?, `lastPlayed` = NULL, `timePlayed` = NULL, `progressionInfamyResets` = NULL, `progressionInfamy` = NULL, `progressionValorResets` = NULL, `progressionValor` = NULL, `progressionGlory` = NULL, `triumphScore` = NULL, `collectionTotal` = NULL, `sealRivensbane` = NULL, `sealCursebreaker` = NULL, `sealChronicler` = NULL, `sealUnbroken` = NULL, `sealDredgen` = NULL, `sealWayfarer` = NULL, `sealBlacksmith` = NULL, `sealReckoner` = NULL WHERE `members`.`membershipType` = ? AND `members`.`membershipId` = ?';

            let inserts = [store.displayName, groupId, CURRENT_TIMESTAMP, task.membershipType, task.membershipId];
            sql = mysql.format(sql, inserts);

            let update = await db.query(sql);

            return;
          }

          memberActual++;

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

          let charTempTriumphs = {};

          for (const [characterId, character] of Object.entries(profile.response.Response.characterRecords.data)) {
            for (const [hash, record] of Object.entries(character.records)) {
              let recordState = enumerateRecordState(record.state);
              if (!recordState.objectiveNotCompleted) {
                if (!charTempTriumphs[hash]) {
                  charTempTriumphs[hash] = 1;
                }
              }
            }
          }

          for (const [hash, record] of Object.entries(charTempTriumphs)) {
            if (triumphStats[hash]) {
              triumphStats[hash]++;
            } else {
              triumphStats[hash] = 1;
            }
          }

          //
          
          let profileTempCollections = {};

          for (const [hash, collectible] of Object.entries(profile.response.Response.profileCollectibles.data.collectibles)) {
            let collectibleState = enumerateCollectibleState(collectible.state);
            if (!collectibleState.notAcquired) {
              if (profileTempCollections[hash]) {
                profileTempCollections[hash]++;
              } else {
                profileTempCollections[hash] = 1;
              }
            }
          }

          for (const [characterId, character] of Object.entries(profile.response.Response.characterCollectibles.data)) {
            for (const [hash, collectible] of Object.entries(character.collectibles)) {
              let collectibleState = enumerateCollectibleState(collectible.state);
              if (!collectibleState.notAcquired) {
                if (profileTempCollections[hash]) {
                  profileTempCollections[hash]++;
                } else {
                  profileTempCollections[hash] = 1;
                }
              }
            }
          }

          for (const [hash, collectible] of Object.entries(profileTempCollections)) {
            if (collectionStats[hash]) {
              collectionStats[hash]++;
            } else {
              collectionStats[hash] = 1;
            }
          }


          //

          let store = await values(profile.response);

          let sql = 'UPDATE `members` SET `displayName` = ?, `groupId` = COALESCE(?, groupId), `lastScraped` = ?, `lastPublic` = ?, `lastPlayed` = ?, `timePlayed` = ?, `progressionInfamyResets` = ?, `progressionInfamy` = ?, `progressionValorResets` = ?, `progressionValor` = ?, `progressionGlory` = ?, `triumphScore` = ?, `collectionTotal` = ?, `sealRivensbane` = ?, `sealCursebreaker` = ?, `sealChronicler` = ?, `sealUnbroken` = ?, `sealDredgen` = ?, `sealWayfarer` = ?, `sealBlacksmith` = ?, `sealReckoner` = ? WHERE `members`.`membershipType` = ? AND `members`.`membershipId` = ?';
          let inserts = [store.displayName, groupId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, store.lastPlayed, store.timePlayed, store.progressionInfamyResets, store.progressionInfamy, store.progressionValorResets, store.progressionValor, store.progressionGlory, store.triumphScore, store.collectionTotal, store.sealRivensbane, store.sealCursebreaker, store.sealChronicler, store.sealUnbroken, store.sealDredgen, store.sealWayfarer, store.sealBlacksmith, store.sealReckoner, task.membershipType, task.membershipId];
          sql = mysql.format(sql, inserts);

          let update = await db.query(sql);

          // console.log(`OK:     ${task.displayName.toString().padStart(20, ' ')} [${task.membershipType}:${task.membershipId}] ${profile.number}/${s.length}`, new Date().getTime() - scrapeStart, 'ms');
        }
      } catch (e) {
        console.log(`Error:  ${task.displayName.toString().padStart(20, ' ')} [${task.membershipType}:${task.membershipId}] ${s.progress}/${s.length}`, e);
      }
    };

    const q = qrate(worker, 200, 200);

    function updateStatsFiles(final = false) {
      
      let tempTriumphStats = {};
      for (const [hash, total] of Object.entries(triumphStats)) {
        tempTriumphStats[hash] = (total / memberActual * 100).toFixed(2);
      }

      fs.writeFile(`./cache/triumphs${final ? '' : '-part'}.json`, JSON.stringify(tempTriumphStats), function(err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully wrote Triumph stats to disk");
        }
      });
      
      let tempCollectionStats = {};
      for (const [hash, total] of Object.entries(collectionStats)) {
        tempCollectionStats[hash] = (total / memberActual * 100).toFixed(2);
      }

      fs.writeFile(`./cache/collections${final ? '' : '-part'}.json`, JSON.stringify(tempCollectionStats), function(err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully wrote Collection stats to disk");
        }
      });
    }

    q.drain = () => {
      const scrapeEnd = new Date().getTime();

      console.log(`Member actual: ${memberActual}`);

      if (!skipStats) {
        updateStatsFiles(true);
      }

      // set status

      setState('0', Math.floor((scrapeEnd - scrapeStart) / 60000));

      // end set status

      clearInterval(intervalTimer);

      q.kill();
    };

    //  WHERE `groupId` = '172382'
    let sql = mysql.format("SELECT `id`, `membershipType`, `membershipId`, `displayName` FROM `members`", []);
    if (minimalScrape) {
      sql = mysql.format("SELECT `id`, `membershipType`, `membershipId`, `displayName` FROM `members` WHERE `lastPublic` IS NOT NULL", []);
    }

    let members = await db.query(sql);

    s.length = members.length;
    members.forEach(m => {
      q.push(m);
    });

    function progressInterval() {
      console.log(chalk.inverse(`${((s.progress / s.length) * 100).toFixed(3)}% [${s.progress.toString().padStart(6, '0')}] of ${s.length} - ${Math.floor((new Date().getTime() - scrapeStart) / 60000)}m elapsed, ~${Math.floor(((new Date().getTime() - scrapeStart) / s.progress) * (s.length - s.progress) / 60000 / 60)}h remaining`));
      if (!skipStats) {
        updateStatsFiles(true);
      }
    }

    const intervalTimer = setInterval(progressInterval, 30000);
    console.log(chalk.inverse(`${((s.progress / s.length) * 100).toFixed(3)}% [${s.progress.toString().padStart(6, '0')}] of ${s.length} - ${Math.floor((new Date().getTime() - scrapeStart) / 60000)}m elapsed`));

    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA'
    });
  } else {
    console.log(`401 scrape token ${req.headers['x-api-key']}`);
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

          let sql = 'INSERT IGNORE INTO `members` (`membershipType`, `membershipId`, `displayName`, `groupId`) VALUES ?';
          let inserts = [members];
          sql = mysql.format(sql, inserts);

          let inserted = await db.query(sql);

          console.log(inserted.changedRows);

          groupsActual++;

          console.log(`OK:     ${task.groupId} ${groupMembers.number}/${s.length}`);
        }
      } catch (e) {
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
    };

    let sql = 'SELECT DISTINCT `groupId` FROM `members`';
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
    console.log(`401 scrape token ${req.headers['x-api-key']}`);
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
