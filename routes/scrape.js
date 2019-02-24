const dotenv = require('dotenv');
const express = require('express');
const fetch = require('node-fetch');
const async = require('async');

const router = express.Router();
const Member = require('../models/member');
const Profile = require('../models/profile');
const profile_controller = require('../controllers/profile');

dotenv.config();

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

router.get('/', async function(req, res, next) {

  if (req.headers['x-api-key'] && req.headers['x-api-key'] === process.env.TOKEN) {

    try {
      await Profile.deleteMany({});
    } catch (e) {
      console.error(e);
    }

    let s = {
      length: 0,
      progress: 0
    };

    var q = async.queue(async function(task) {
      let request;

      s.progress++;

      try {
        console.log(`GET:    ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length}`);
        request = await callBungie(task.membershipType, task.membershipId, s.progress);
      } catch(e) {
        console.log(`Error:  ${task.membershipType}:${task.membershipId} ${s.progress}/${s.length}`, e);
      }

      if (request.response.ErrorCode !== 1) {
        console.log(`Bungie: ${task.membershipType}:${task.membershipId} ${request.number}/${s.length} ErrorCode: ${request.response.ErrorCode}`);
      }
      
      profile_controller.PROFILE_STORE(request.response);

      console.log(`OK:     ${task.membershipType}:${task.membershipId} ${request.number}/${s.length}`);
    }, 7);

    let members;
    try {
      members = await Member.find();
    } catch (e) {
      console.error(e);
    }

    s.length = members.length;
    members.forEach(m => {
      q.push(m);
    });


    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA'
    });
  } else {
    console.log(process.env.TOKEN)
    res.status(401).send({
      ErrorCode: 401,
      Message: 'VOLUSPA'
    });
  }
});

module.exports = router;
