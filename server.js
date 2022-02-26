require('dotenv').config();

const express = require('express');
const axios = require('axios');
const morgan = require('morgan');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

let getLocationResults = location => {
  return new Promise(async (resolve, reject) => {
    let offset = 0;
    let results = [];
    let resultCounter = 0;
    let total = 1;
    while (resultCounter < total) {
      await axios
        .get('https://api.yelp.com/v3/businesses/search', {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            radius: 800,
            limit: 50,
            offset: offset,
          },
          headers: {
            authorization: `Bearer ${process.env.API_KEY}`,
          },
        })
        .then(({ data }) => {
          offset += data.businesses.length;
          resultCounter += data.businesses.length;
          total = data.total;

          results.push(data.businesses);
        })
        .catch(err => {
          if (err.response.status === 429) {
            console.log(err.response.data.error);
          } else {
            reject(err);
          }
        });
    }
    resolve(results);
  });
};

app.get('/businesses', async (req, res) => {
  try {
    let locations = req.query.businesses;
    let locationResults = [];

    for (let i = 0; i < locations.length; i++) {
      locationResults.push(getLocationResults(locations[i]));
    }

    const resolved = (await Promise.all(locationResults)).map(
      (businesses, i) => {
        return {
          location: locations[i].location,
          businesses: businesses.flat(),
        };
      }
    );
    res.status(200).send({ results: resolved });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(process.env.PORT, () =>
  console.log(`App listening on port ${process.env.PORT}!`)
);
