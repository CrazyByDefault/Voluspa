const Member = require('../models/member');

exports.MEMBER_STORE = function(req, res, next) {
  let member = new Member({
    membershipType: req.body.membershipType,
    membershipId: req.body.membershipId
  });

  member.save(function(err) {
    if (err) {
      // return next(err);

      res.status(200).send({ Message: 'Welcome back' });
      return;
    }
    res.status(201).send({ Message: 'Hi friend' });
  });
};
