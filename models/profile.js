const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let schema = new Schema({
  membershipType: {
    type: String,
    required: true
  },
  membershipId: {
    type: String,
    required: true
  },
  timePlayed: {
    type: Int,
    required: true
  },
  triumphScore: {
    type: Int,
    required: true
  },
  infamyProgression: {
    type: Int,
    required: true
  },
  infamyResets: {
    type: Int,
    required: true
  },
  valorProgression: {
    type: Int,
    required: true
  },
  valorResets: {
    type: Int,
    required: true
  },
  gloryProgression: {
    type: Int,
    required: true
  }
});

let Profile = mongoose.model('Profile', schema);


module.exports = Profile;