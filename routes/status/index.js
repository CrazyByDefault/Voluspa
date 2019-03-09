const dotenv = require('dotenv');
const express = require('express');

const router = express.Router();

dotenv.config();

router.get('/', async function(req, res, next) {

  try {
    let status = await Status.find();
    
    res.status(200).send({
      ErrorCode: 1,
      Message: 'VOLUSPA',
      Response: {
        scraper: status
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
