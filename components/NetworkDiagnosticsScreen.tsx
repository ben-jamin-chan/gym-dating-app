import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { checkNetworkStatus, testInternetConnectivity, getDetailedNetworkInfo } from '@/utils/networkUtilsLite';
import { SafeAreaView } from 'react-native-safe-area-context';
import networkReconnectionManager from '@/utils/NetworkReconnectionManager';
import { refreshFirebaseConnection } from '@/utils/firebase';

type DiagnosticResult = {
  test: string;
  status: 'success' | 'failure' | 'pending';
  details?: string;
};

const NetworkDiagnosticsScreen = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [detailedInfo, setDetailedInfo] = useState<any>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState<{timestamp: string, action: string, success: boolean}[]>([]);

  // Run diagnostics
  const runDiagnostics = async () => {
    if (isRunningTests) return;
    
    setIsRunningTests(true);
    setResults([
      { test: 'Network Connection', status: 'pending' },
      { test: 'Internet Connectivity', status: 'pending' },
    ]);

    // Test network connection
    try {
      const isConnected = await checkNetworkStatus();
      setResults(prev => {
        const updated = [...prev];
        updated[0] = { 
          test: 'Network Connection', 
          status: isConnected ? 'success' : 'failure',
          details: isConnected ? 'Device has an active network connection' : 'Device has no active network connection'
        };
        return updated;
      });
    } catch (error) {
      setResults(prev => {
        const updated = [...prev];
        updated[0] = { 
          test: 'Network Connection', 
          status: 'failure',
          details: `Error checking network: ${error}`
        };
        return updated;
      });
    }

    // Test internet connectivity
    try {
      const hasInternet = await testInternetConnectivity();
      setResults(prev => {
        const updated = [...prev];
        updated[1] = { 
          test: 'Internet Connectivity', 
          status: hasInternet ? 'success' : 'failure',
          details: hasInternet 
            ? 'Successfully connected to internet endpoints' 
            : 'Failed to connect to any internet test endpoints'
        };
        return updated;
      });
    } catch (error) {
      setResults(prev => {
        const updated = [...prev];
        updated[1] = { 
          test: 'Internet Connectivity', 
          status: 'failure',
          details: `Error testing internet: ${error}`
        };
        return updated;
      });
    }

    // Get detailed network info
    try {
      const info = await getDetailedNetworkInfo();
      setDetailedInfo(info);
    } catch (error) {
      console.error('Error getting detailed network info:', error);
    }

    setIsRunningTests(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);
  
  // Force Firebase reconnection
  const forceFirebaseReconnection = async () => {
    setIsReconnecting(true);
    const timestamp = new Date().toISOString();
    
    try {
      // Log start of reconnection
      setConnectionHistory(prev => [
        { timestamp, action: 'Starting Firebase reconnection', success: true },
        ...prev
      ]);
      
      // First try the network reconnection manager
      const success = await networkReconnectionManager.manualReconnect();
      
      // Log result of reconnection manager
      setConnectionHistory(prev => [
        { 
          timestamp: new Date().toISOString(), 
          action: 'NetworkReconnectionManager.manualReconnect()', 
          success
        },
        ...prev
      ]);
      
      // If that fails, try direct Firebase reconnection
      if (!success) {
        setConnectionHistory(prev => [
          { 
            timestamp: new Date().toISOString(), 
            action: 'NetworkReconnectionManager failed, trying direct refreshFirebaseConnection()', 
            success: true
          },
          ...prev
        ]);
        
        const directSuccess = await refreshFirebaseConnection();
        
        // Log result of direct Firebase reconnection
        setConnectionHistory(prev => [
          { 
            timestamp: new Date().toISOString(), 
            action: 'Direct refreshFirebaseConnection()', 
            success: directSuccess
          },
          ...prev
        ]);
      }
      
      // Re-run the diagnostics to update network status
      runDiagnostics();
      
      // Final status
      setConnectionHistory(prev => [
        { 
          timestamp: new Date().toISOString(), 
          action: 'Reconnection process completed', 
          success: true
        },
        ...prev
      ]);
      
    } catch (error) {
      console.error('Error during reconnection:', error);
      setConnectionHistory(prev => [
        { 
          timestamp: new Date().toISOString(), 
          action: `Error during reconnection: ${error}`, 
          success: false
        },
        ...prev
      ]);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Render a test result item
  const renderResultItem = (item: DiagnosticResult, index: number) => {
    return (
      <View key={index} style={styles.resultItem}>
        <View style={styles.resultHeader}>
          <Text style={styles.testName}>{item.test}</Text>
          {item.status === 'pending' ? (
            <ActivityIndicator size="small" color="#0EA5E9" />
          ) : item.status === 'success' ? (
            <View style={[styles.statusIndicator, styles.successIndicator]} />
          ) : (
            <View style={[styles.statusIndicator, styles.failureIndicator]} />
          )}
        </View>
        
        {item.details && (
          <Text style={styles.detailText}>{item.details}</Text>
        )}
      </View>
    );
  };

  // Render detailed network info
  const renderDetailedInfo = () => {
    if (!detailedInfo) return null;

    return (
      <View style={styles.resultItem}>
        <Text style={[styles.testName, {marginBottom: 12}]}>Detailed Network Information</Text>
        
        <Text style={styles.detailLabel}>Connection Type:</Text>
        <Text style={styles.detailValue}>{detailedInfo.connectionType}</Text>
        
        {detailedInfo.details?.ssid && (
          <>
            <Text style={styles.detailLabel}>WiFi SSID:</Text>
            <Text style={styles.detailValue}>{detailedInfo.details.ssid}</Text>
          </>
        )}
        
        {detailedInfo.details?.cellularGeneration && (
          <>
            <Text style={styles.detailLabel}>Cellular Generation:</Text>
            <Text style={styles.detailValue}>{detailedInfo.details.cellularGeneration}</Text>
          </>
        )}
        
        <Text style={styles.detailLabel}>Expensive Connection:</Text>
        <Text style={styles.detailValue}>{detailedInfo.details.isConnectionExpensive ? 'Yes' : 'No'}</Text>
        
        {detailedInfo.details?.ipAddress && (
          <>
            <Text style={styles.detailLabel}>IP Address:</Text>
            <Text style={styles.detailValue}>{detailedInfo.details.ipAddress}</Text>
          </>
        )}
        
        <TouchableOpacity 
          style={styles.helpLink}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Linking.openURL('https://support.apple.com/guide/iphone/troubleshoot-the-cellular-data-connection-iph3dd55bf1/ios');
            }
          }}
        >
          <Text style={styles.helpLinkText}>View network troubleshooting guide →</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Render Firebase reconnection section
  const renderFirebaseSection = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Firebase Connection</Text>
        
        <TouchableOpacity 
          style={[
            styles.reconnectButton, 
            isReconnecting && styles.reconnectingButton
          ]} 
          onPress={forceFirebaseReconnection}
          disabled={isReconnecting}
        >
          {isReconnecting ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.reconnectButtonText}>Reconnecting...</Text>
            </>
          ) : (
            <Text style={styles.reconnectButtonText}>Force Firebase Reconnection</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.sectionDescription}>
          Use this when your app shows connection errors but your device has internet access.
          This will force Firebase to reset its connection.
        </Text>
        
        {connectionHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Connection History</Text>
            <ScrollView style={styles.historyScroll}>
              {connectionHistory.map((entry, index) => (
                <View key={index} style={styles.historyEntry}>
                  <Text style={styles.historyTimestamp}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </Text>
                  <Text style={[
                    styles.historyAction,
                    entry.success ? styles.historySuccess : styles.historyFailure
                  ]}>
                    {entry.action}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Network Diagnostics</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={runDiagnostics}
          disabled={isRunningTests}
        >
          {isRunningTests ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.refreshButtonText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Tests</Text>
          {results.map(renderResultItem)}
        </View>
        
        {renderFirebaseSection()}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network Details</Text>
          {renderDetailedInfo()}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            If you're experiencing connectivity issues with your simulator, try toggling Airplane Mode or restarting the simulator.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0EA5E9',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#0F172A',
  },
  resultItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  successIndicator: {
    backgroundColor: '#10B981',
  },
  failureIndicator: {
    backgroundColor: '#EF4444',
  },
  detailText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
  },
  detailValue: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 6,
  },
  helpLink: {
    marginTop: 12,
  },
  helpLinkText: {
    color: '#0EA5E9',
    fontSize: 14,
  },
  footer: {
    padding: 16,
    marginBottom: 16,
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 12,
  },
  reconnectButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  reconnectingButton: {
    backgroundColor: '#60A5FA',
  },
  reconnectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  historyContainer: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#0F172A',
  },
  historyScroll: {
    maxHeight: 150,
  },
  historyEntry: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyTimestamp: {
    width: 80,
    fontSize: 12,
    color: '#64748B',
  },
  historyAction: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
  },
  historySuccess: {
    color: '#10B981',
  },
  historyFailure: {
    color: '#EF4444',
  },
});

export default NetworkDiagnosticsScreen; 