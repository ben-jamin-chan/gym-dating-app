const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Add settings necessary for RNMapsAirModule
 */
module.exports = function withIosMaps(config) {
  return withInfoPlist(config, config => {
    const infoPlist = config.modResults;
    
    // Add RNMapsAirModule settings
    infoPlist.NSLocationWhenInUseUsageDescription = infoPlist.NSLocationWhenInUseUsageDescription || 
      'This app needs access to your location to show your position on the map';
      
    // Add GoogleMaps API key settings
    infoPlist.GMSApiKey = '${IOS_GOOGLE_MAPS_API_KEY}';
    
    return config;
  });
}; 