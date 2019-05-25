const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const router = express.Router();

const db = require('../../db');


dotenv.config();

router.get('/', async function(req, res, next) {

  let limit = parseInt(req.query.limit, 10) || 10;
  let offset = parseInt(req.query.offset, 10) || 0;
  let sort = req.query.sort || 'triumphScore';
  let groupId = req.query.groupId || false;

  if (groupId) {
    groupId = parseInt(groupId, 10);
  }

  if (sort === 'triumphScore') {
    sort = 'triumphScoreRank'
  } else if (sort === 'collectionTotal') {
    sort = 'collectionTotalRank'
  } else if (sort === 'timePlayed') {
    sort = 'timePlayedRank'
  } else {
    res.status(200).send({
      ErrorCode: 500,
      Message: 'VOLUSPA'
    });
  }

  try {
    let sql = `SELECT members.*, ranks.?? AS 'rank' 
    FROM members, ranks 
    WHERE ranks.membershipType = members.membershipType AND ranks.membershipId = members.membershipId 
    ORDER BY ranks.?? ASC 
    LIMIT ? OFFSET ?;

    SELECT count(*) as 'results' FROM ranks;`;
    sql = mysql.format(sql, [sort, sort, limit, offset]);

    if (groupId) {
      sql = `SELECT * 
      FROM members 
      INNER JOIN ranks ON members.membershipType = ranks.membershipType AND members.membershipId = ranks.membershipId 
      WHERE members.lastScraped = members.lastPublic AND members.groupId = ?;`;
      sql = mysql.format(sql, [groupId, groupId]);
    }

    let results = await db.query(sql);

    let data;
    if (groupId) {
      data = results.map((p, i) => {
        return {
          destinyUserInfo: {
            membershipType: p.membershipType,
            membershipId: p.membershipId,
            displayName: p.displayName,
            groupId: p.groupId,
            lastScraped: p.lastScraped,
            lastPublic: p.lastPublic,
            lastPlayed: p.lastPlayed,
            timePlayed: p.timePlayed,
            wasPrivate: new Date(p.lastPublic).getTime() !== new Date(p.lastScraped).getTime()
          },
          triumphScore: p.triumphScore,
          collectionTotal: p.collectionTotal,
          progression: {
            valor: p.progressionValor,
            valorResets: p.progressionValorResets,
            infamy: p.progressionInfamy,
            infamyResets: p.progressionInfamyResets,
            glory: p.progressionGlory
          },
          seals: {
            rivensbane: !!p.sealRivensbane,
            cursebreaker: !!p.sealCursebreaker,
            chronicler: !!p.sealChronicler,
            unbroken: !!p.sealUnbroken,
            dredgen: !!p.sealDredgen,
            wayfarer: !!p.sealWayfarer,
            blacksmith: !!p.sealBlacksmith,
            recokoner: !!p.sealReckoner
          },
          ranks: {
            triumphScore: p.triumphScoreRank,
            collectionTotal: p.collectionTotalRank,
            timePlayed: p.timePlayedRank
          }
        }
      });
    } else {
      data = results[0].map((p, i) => {
        return {
          destinyUserInfo: {
            membershipType: p.membershipType,
            membershipId: p.membershipId,
            displayName: p.displayName,
            groupId: p.groupId,
            lastScraped: p.lastScraped,
            lastPublic: p.lastPublic,
            lastPlayed: p.lastPlayed,
            timePlayed: p.timePlayed,
            wasPrivate: new Date(p.lastPublic).getTime() !== new Date(p.lastScraped).getTime()
          },
          triumphScore: p.triumphScore,
          collectionTotal: p.collectionTotal,
          progression: {
            valor: p.progressionValor,
            valorResets: p.progressionValorResets,
            infamy: p.progressionInfamy,
            infamyResets: p.progressionInfamyResets,
            glory: p.progressionGlory
          },
          seals: {
            rivensbane: !!p.sealRivensbane,
            cursebreaker: !!p.sealCursebreaker,
            chronicler: !!p.sealChronicler,
            unbroken: !!p.sealUnbroken,
            dredgen: !!p.sealDredgen,
            wayfarer: !!p.sealWayfarer,
            blacksmith: !!p.sealBlacksmith,
            recokoner: !!p.sealReckoner
          },
          rank: p.rank
        }
      });
    }

    let status = "OK";

    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA',
      Response: {
        status,
        data,
        offset,
        limit,
        results: groupId ? data.length : results[1][0].results
      }
    });

  } catch (e) {
    console.error(e);

    res.status(200).send({
      ErrorCode: 500,
      Message: 'VOLUSPA'
    });
  }

});

router.get('/position', async function(req, res, next) {
 
  let membershipType = req.query.membershipType || false;
  let membershipId = req.query.membershipId || false;
  let sort = req.query.sort || 'triumphScore';

  if (sort === 'triumphScore') {
    sort = 'triumphScoreRank'
  } else if (sort === 'collectionTotal') {
    sort = 'collectionTotalRank'
  } else if (sort === 'timePlayed') {
    sort = 'timePlayedRank'
  } else {
    res.status(200).send({
      ErrorCode: 500,
      Message: 'VOLUSPA'
    });
  }

  if (!membershipType || !membershipId) {
    res.status(200).send({
      ErrorCode: 500,
      Message: 'VOLUSPA'
    });
  }

  try {
    let sql = "SELECT `members`.*, `ranks`.`triumphScoreRank`, `ranks`.`collectionTotalRank`, `ranks`.`timePlayedRank` FROM `members`, `ranks` WHERE `members`.`membershipType` = ? AND `members`.`membershipId` = ? AND  `ranks`.`membershipType` = ? AND `ranks`.`membershipId` = ?";
    let inserts = [membershipType, membershipId, membershipType, membershipId];
    sql = mysql.format(sql, inserts);

    let results = await db.query(sql);

    let data = results.map((p, i) => {
      return {
        destinyUserInfo: {
          membershipType: p.membershipType,
          membershipId: p.membershipId,
          displayName: p.displayName,
          groupId: p.groupId,
          lastScraped: p.lastScraped,
          lastPublic: p.lastPublic,
          lastPlayed: p.lastPlayed,
          timePlayed: p.timePlayed,
          wasPrivate: new Date(p.lastPublic).getTime() !== new Date(p.lastScraped).getTime()
        },
        triumphScore: p.triumphScore,
        collectionTotal: p.collectionTotal,
        progression: {
          valor: p.progressionValor,
          valorResets: p.progressionValorResets,
          infamy: p.progressionInfamy,
          infamyResets: p.progressionInfamyResets,
          glory: p.progressionGlory
        },
        seals: {
          rivensbane: !!p.sealRivensbane,
          cursebreaker: !!p.sealCursebreaker,
          chronicler: !!p.sealChronicler,
          unbroken: !!p.sealUnbroken,
          dredgen: !!p.sealDredgen,
          wayfarer: !!p.sealWayfarer,
          blacksmith: !!p.sealBlacksmith,
          recokoner: !!p.sealReckoner
        },
        ranks: {
          triumphScore: p.triumphScoreRank,
          collectionTotal: p.collectionTotalRank,
          timePlayed: p.timePlayedRank
        }
      }
    });

    let status = "OK";

    if (data.length === 1) {
      data = data[0];
    } else if (data.length === 0) {
      status = "This member is scheduled for tracking. Check back soon!";
      data = false;

      try {
        let sql = "INSERT IGNORE INTO `members` (`id`, `membershipType`, `membershipId`) VALUES (NULL, ?, ?)";
        let inserts = [membershipType, membershipId];
        sql = mysql.format(sql, inserts);

        let data = await db.query(sql);
      } catch (e) {

      }
    }

    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA',
      Response: {
        status,
        data
      }
    });

  } catch (e) {
    console.error(e);

    res.status(200).send({
      ErrorCode: 500,
      Message: 'VOLUSPA'
    });
  }

});

module.exports = router;
