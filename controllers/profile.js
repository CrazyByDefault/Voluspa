const Profile = require('../models/profile');

exports.PROFILE_STORE = function(blob) {
  let profile = new Profile({
    response: blob
  });

  profile.save(function(err) {
    if (err) {
      console.log(err)
    }
  });
};

exports.PROFILE_RESET = function() {
  Profile.remove({});
};
