const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let schema = new Schema({
  response: {
    type: Object,
    required: true
  }
});

let Profile = mongoose.model('Profile', schema);


module.exports = Profile;