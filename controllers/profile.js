const Profile = require('../models/profile');

exports.PROFILE_STORE = function(obj) {
  let profile = new Profile(obj);

  profile.save(function(err) {
    if (err) {
      console.log(err);
    }
  });
};