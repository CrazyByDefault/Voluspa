const dotenv = require('dotenv');
const express = require('express');

const router = express.Router();
const Profile = require('../../models/profile');

dotenv.config();

router.get('/', async function(req, res, next) {

  console.log(req.query)

  let limit = 25;
  let offset = parseInt(req.query.offset, 10) || 0;
  let sort = req.query.sort || 'triumphScore';

  try {
    let profiles = await Profile.find().sort( { [sort]: -1 } ).limit(limit).skip(offset);
    let data = profiles.map(p => {
      return {
        membershipType: p.membershipType,
        membershipId: p.membershipId,
        displayName: p.displayName,
        dateLastPlayed: p.dateLastPlayed,
        characters: p.characters,
        timePlayed: p.timePlayed,
        triumphScore: p.triumphScore,
        infamyProgression: p.infamyProgression,
        infamyResets: p.infamyResets,
        valorProgression: p.valorProgression,
        valorResets: p.valorResets,
        gloryProgression: p.gloryProgression
      }
    });
    
    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA',
      Response: {
        data
      }
    });
  } catch (e) {
    console.error(e);

    res.status(200).send({
      ErrorCode: 500,
      Message: 'VOLUSPA',
      Response: e
    });
  }

});

module.exports = router;
