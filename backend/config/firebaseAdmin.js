const admin = require('firebase-admin');

const getCredential = () => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    return admin.credential.cert(JSON.parse(serviceAccountJson));
  }

  return admin.credential.applicationDefault();
};

if (!admin.apps.length) {
  const options = {
    credential: getCredential(),
  };

  if (process.env.FIREBASE_PROJECT_ID) {
    options.projectId = process.env.FIREBASE_PROJECT_ID;
  }

  admin.initializeApp(options);
}

module.exports = admin;
