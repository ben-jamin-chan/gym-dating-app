import React from 'react';
import { Platform, View, StyleSheet, Text } from 'react-native';
import NativeMapView, { 
  Marker as NativeMarker, 
  Callout as NativeCallout,
  PROVIDER_GOOGLE as NATIVE_PROVIDER_GOOGLE,
  Region as NativeRegion,
  MapViewProps as NativeMapViewProps
} from 'react-native-maps';
import { TouchableOpacity } from 'react-native-gesture-handler';

// Forward all props from react-native-maps
type MapViewProps = NativeMapViewProps & {
  children?: React.ReactNode;
};

// Web fallback component
function WebMapFallback({ children, style, ...props }: MapViewProps) {
  return (
    <View style={[styles.webFallback, style]}>
      <Text style={styles.webFallbackText}>
        Maps are only available on mobile devices
      </Text>
      <View style={styles.dummyMap}>
        {children}
      </View>
    </View>
  );
}

// Export components based on platform
export const MapView = Platform.select({
  ios: NativeMapView,
  android: NativeMapView,
  default: WebMapFallback,
}) as React.ComponentType<MapViewProps>;

export const Marker = Platform.select({
  ios: NativeMarker,
  android: NativeMarker,
  default: View,
}) as React.ComponentType<any>;

export const Callout = Platform.select({
  ios: NativeCallout,
  android: NativeCallout,
  default: View,
}) as React.ComponentType<any>;

export const PROVIDER_GOOGLE = NATIVE_PROVIDER_GOOGLE;

export type Region = NativeRegion;

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  webFallbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 20,
  },
  dummyMap: {
    opacity: 0,
    position: 'absolute',
  }
}); 