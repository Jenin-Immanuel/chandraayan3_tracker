require("dotenv").config();
const superagent = require("superagent");
const satellite = require("satellite.js");
const { TwitterApi } = require("twitter-api-v2");

const app = express();
const T = new TwitterApi({
  appKey: process.env.APP_KEY,
  appSecret: process.env.APP_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

const url = process.env.CHANDRAAYAN_URL;

const action = async () => {
  const res = await superagent.get(url);
  const tle = res.text;
  const satrec = satellite.twoline2satrec(
    tle.split("\n")[1].trim(),
    tle.split("\n")[2].trim()
  );

  // Position and velocity
  const posVel = satellite.propagate(satrec, new Date());

  const positionEci = posVel.position;
  const velocityEci = posVel.velocity;

  const observerGd = {
    longitude: satellite.degreesToRadians(-122.0308),
    latitude: satellite.degreesToRadians(36.9613422),
    height: 0.37,
  };

  const gmst = satellite.gstime(new Date());

  const positionEcf = satellite.eciToEcf(positionEci, gmst);
  const velocityEcf = satellite.ecfToEci(velocityEci, gmst);
  const observerEcf = satellite.geodeticToEcf(observerGd);
  const positionGd = satellite.eciToGeodetic(positionEci, gmst);
  const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
  const dopplerFactor = satellite.dopplerFactor(
    observerEcf,
    positionEcf,
    velocityEcf
  );

  var satelliteX = positionEci.x,
    satelliteY = positionEci.y,
    satelliteZ = positionEci.z;

  var azimuth = lookAngles.azimuth,
    elevation = lookAngles.elevation,
    rangeSat = lookAngles.rangeSat;

  var longitude = positionGd.longitude,
    latitude = positionGd.latitude,
    height = positionGd.height;

  var longitudeDeg = satellite.degreesLong(longitude),
    latitudeDeg = satellite.degreesLat(latitude);

  const tweet = `Chandraayan 3 Current Position:
Position: x=${satelliteX.toFixed(3)}, y=${satelliteY.toFixed(
    3
  )}, z=${satelliteZ.toFixed(3)}
Look Angles: azimuth(Horizontal angle)=${azimuth.toFixed(
    3
  )},elevation(Vertical Angle)=${elevation.toFixed(
    3
  )},rangeSat=${rangeSat.toFixed(3)}
Geodetic Coordinates:longitude=${longitudeDeg.toFixed(
    3
  )},latitude=${latitudeDeg.toFixed(3)}
#chandraayan3 #india #ISRO #space #moon`;
  return tweet;
};

const postTweet = async (tweet) => {
  try {
    await T.readWrite.v2.tweet(tweet);
  } catch (err) {
    console.error(err);
  }
};

const main = async () => {
  const t = await action();
  postTweet(t);
};

main();
