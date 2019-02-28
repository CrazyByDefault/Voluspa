const Profile = require('../models/profile');

exports.PROFILE_STORE = function(membershipType, membershipId, timePlayed, triumphScore, gambitRank, gambitResets, valorRank, valorResets, gloryRank) {
  let profile = new Profile({
    membershipType,
    membershipId,
    timePlayed,
    triumphScore,
    gambitRank,
    gambitResets,
    valorRank,
    valorResets,
    gloryRank
  });

  profile.save(function(err) {
    if (err) {
      console.log(err);
    }
  });
};

exports.PROFILE_RESET = function() {
  Profile.remove({});
};
