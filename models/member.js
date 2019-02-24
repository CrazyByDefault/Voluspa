const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let schema = new Schema({
  membershipType: {
    type: String,
    required: true
  },
  membershipId: {
    type: String,
    required: true,
    validate: {
      isAsync: true,
      validator: function(v, cb) {
        Member.find({membershipId: v}, function(err,docs){
          cb(docs.length == 0);
        });
      },
      message: 'member already exists!'
    }
  }
});

let Member = mongoose.model('Member', schema);


module.exports = Member;