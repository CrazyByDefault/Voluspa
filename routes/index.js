const dotenv = require('dotenv');
const express = require('express');
const _ = require('lodash');
const fs = require('fs');

const router = express.Router();
const Profile = require('../models/profile');

dotenv.config();

router.get('/', function(req, res, next) {

  let cache;
  fs.readFile('cache.json', 'utf-8', function(err, buffer) {
    if (err) {
      console.log(err);
    }
    cache = JSON.parse(buffer);

    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA',
      Response: cache
    });
  });
});

router.get('/generate', async function(req, res, next) {

  if (req.headers['x-api-key'] && req.headers['x-api-key'] === process.env.TOKEN) {

    res.status(201).send({
      ErrorCode: 1,
      Message: 'VOLUSPA'
    });

    let limit = 50;
    let skip = 0;
    let done = false;

    let ranks = [];
    let responseErrors = 0;

    while (!done) {

      let profile;
      try {
        profile = await Profile.find().limit(limit).skip(skip);
        
        console.log(`Building cache: ${skip} (${profile.length})`);
      } catch (e) {
        console.error(e);
      }

      if (profile.length < 50) {
        done = true;
      }

      skip = skip + limit;

      profile.forEach(profile => {

        if (!profile.response) {
          responseErrors++;
          return;
        }

        if (!profile.response.Response.profileRecords.data) {
          // responseErrors++;
          // console.log(`${profile.response.Response.profile.data.userInfo.displayName} ${profile.response.Response.profile.data.userInfo.membershipType}/${profile.response.Response.profile.data.userInfo.membershipId}`);
          return;
        }

        let Response = profile.response.Response;

        let timePlayed = Object.keys(Response.characters.data).reduce((sum, key) => {
          return sum + parseInt(Response.characters.data[key].minutesPlayedTotal);
        }, 0);

        ranks.push({
          userInfo: Response.profile.data.userInfo,
          timePlayed,
          triumphScore: Response.profileRecords.data.score
        });
      });

    }

    let now = new Date().toISOString();

    let data = {
      data: {
        modified: now,
        tracking: ranks.length,
        errors: responseErrors,
        ranking: _.orderBy(ranks, [r => r.triumphScore], ['desc'])
      }
    }
    data = JSON.stringify(data);

    fs.writeFile('cache.json', data, function(err, data) {
      if (err) {
        console.log(err);
      }
    });
  } else {
    res.status(401).send({
      ErrorCode: 401,
      Message: 'VOLUSPA'
    });
  }
});

module.exports = router;
