const { withAndroidManifest } = require('@expo/config-plugins');
const { getMainApplicationOrThrow } = require('@expo/config-plugins/build/android/Manifest');

/**
 * Add the RNMapsAirModule fix
 */
module.exports = function withAndroidMaps(config) {
  return withAndroidManifest(config, config => {
    const androidManifest = config.modResults;
    const mainApplication = getMainApplicationOrThrow(androidManifest);

    // Check if the RNMapsAirModule metadata exists
    if (!mainApplication['meta-data']) {
      mainApplication['meta-data'] = [];
    }

    // Add the meta-data if it doesn't exist
    const metaDataName = 'com.google.android.geo.API_KEY';
    const existingMetaData = mainApplication['meta-data'].find(
      item => item.$['android:name'] === metaDataName
    );

    if (!existingMetaData) {
      mainApplication['meta-data'].push({
        $: {
          'android:name': metaDataName,
          'android:value': '${googleMapsApiKey}'
        }
      });
    }

    return config;
  });
}; 