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
  displayName: {
    type: String,
    required: true
  },
  characters: {
    type: Object,
    required: true
  },
  timePlayed: {
    type: Number,
    required: true,
    tags: { type: [Number], index: true }
  },
  triumphScore: {
    type: Number,
    required: true,
    tags: { type: [Number], index: true }
  },
  infamyProgression: {
    type: Number,
    required: true
  },
  infamyResets: {
    type: Number,
    required: true,
    tags: { type: [Number], index: true }
  },
  valorProgression: {
    type: Number,
    required: true
  },
  valorResets: {
    type: Number,
    required: true,
    tags: { type: [Number], index: true }
  },
  gloryProgression: {
    type: Number,
    required: true,
    tags: { type: [Number], index: true }
  }
});

let Profile = mongoose.model('Profile', schema);


module.exports = Profile;