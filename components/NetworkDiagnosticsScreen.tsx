import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { checkNetworkStatus, testInternetConnectivity, getDetailedNetworkInfo } from '@/utils/networkUtilsLite';
import { SafeAreaView } from 'react-native-safe-area-context';
import networkReconnectionManager from '@/utils/NetworkReconnectionManager';
import { refreshFirebaseConnection, refreshConversationsData, refreshMessagesData } from '@/utils/firebase';
import { getSuperLikeStatus, useSuperLike, resetSuperLikes, clearSuperLikeCache } from '@/services/superLikeService';
import { getCurrentUser } from '@/utils/firebase';

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
  
  // Super Like test state
  const [superLikeStatus, setSuperLikeStatus] = useState<any>(null);
  const [superLikeTestRunning, setSuperLikeTestRunning] = useState(false);
  const [superLikeTestResults, setSuperLikeTestResults] = useState<{test: string, success: boolean, details: string}[]>([]);

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

        <TouchableOpacity 
          style={[
            styles.reconnectButton, 
            { backgroundColor: '#10B981', marginTop: 8 },
            isReconnecting && styles.reconnectingButton
          ]} 
          onPress={forceAppRefresh}
          disabled={isReconnecting}
        >
          {isReconnecting ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.reconnectButtonText}>Refreshing...</Text>
            </>
          ) : (
            <Text style={styles.reconnectButtonText}>Force Complete App Refresh</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.sectionDescription}>
          Use Firebase reconnection when your app shows connection errors. Use Complete App Refresh when both Super Likes and messages are stuck or showing errors.
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

  // Render Super Like test section
  const renderSuperLikeSection = () => {
    const user = getCurrentUser();
    
    if (!user) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Super Like Diagnostics</Text>
          <Text style={styles.sectionDescription}>
            You must be logged in to test Super Like functionality.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Super Like Diagnostics</Text>
        <Text style={styles.sectionDescription}>
          Test Super Like functionality and view current status.
        </Text>
        
        {superLikeStatus && (
          <View style={styles.resultItem}>
            <Text style={styles.testName}>Current Super Like Status</Text>
            <Text style={styles.detailText}>Remaining: {superLikeStatus.remaining}/{superLikeStatus.total}</Text>
            <Text style={styles.detailText}>Can Use: {superLikeStatus.canUse ? 'Yes' : 'No'}</Text>
            <Text style={styles.detailText}>Hours Until Reset: {superLikeStatus.hoursUntilReset}</Text>
            <Text style={styles.detailText}>Reset Time: {superLikeStatus.resetTime ? new Date(superLikeStatus.resetTime.toDate()).toLocaleString() : 'Unknown'}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.reconnectButton, superLikeTestRunning && styles.reconnectingButton]} 
          onPress={runSuperLikeTests}
          disabled={superLikeTestRunning}
        >
          {superLikeTestRunning ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.reconnectButtonText}>Testing...</Text>
            </>
          ) : (
            <Text style={styles.reconnectButtonText}>Test Super Like System</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.reconnectButton, { backgroundColor: '#EF4444', marginTop: 8 }]} 
          onPress={resetSuperLikesForTest}
          disabled={superLikeTestRunning}
        >
          <Text style={styles.reconnectButtonText}>Reset Super Likes (Test)</Text>
        </TouchableOpacity>
        
        {superLikeTestResults.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Test Results</Text>
            {superLikeTestResults.map((result, index) => (
              <View key={index} style={styles.historyEntry}>
                <Text style={[
                  styles.historyAction,
                  result.success ? styles.historySuccess : styles.historyFailure
                ]}>
                  {result.test}: {result.success ? '✅' : '❌'}
                </Text>
                <Text style={styles.detailText}>{result.details}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Run Super Like tests
  const runSuperLikeTests = async () => {
    const user = getCurrentUser();
    if (!user) return;
    
    setSuperLikeTestRunning(true);
    setSuperLikeTestResults([]);
    
    const testResults: {test: string, success: boolean, details: string}[] = [];
    
    // Test 1: Get Super Like status
    try {
      const status = await getSuperLikeStatus(user.uid);
      setSuperLikeStatus(status);
      testResults.push({
        test: 'Get Status',
        success: true,
        details: `Retrieved status: ${status.remaining}/${status.total} remaining`
      });
    } catch (error) {
      testResults.push({
        test: 'Get Status',
        success: false,
        details: `Error: ${(error as any)?.message || 'Unknown error'}`
      });
    }
    
    // Test 2: Clear cache
    try {
      clearSuperLikeCache();
      testResults.push({
        test: 'Clear Cache',
        success: true,
        details: 'Super Like cache cleared successfully'
      });
    } catch (error) {
      testResults.push({
        test: 'Clear Cache',
        success: false,
        details: `Error: ${(error as any)?.message || 'Unknown error'}`
      });
    }
    
    // Test 3: Check network connectivity
    try {
      const isOnline = await checkNetworkStatus();
      testResults.push({
        test: 'Network Check',
        success: isOnline,
        details: isOnline ? 'Device is online' : 'Device is offline'
      });
    } catch (error) {
      testResults.push({
        test: 'Network Check',
        success: false,
        details: `Error: ${(error as any)?.message || 'Unknown error'}`
      });
    }

    // Test 4: Test conversations refresh
    try {
      const conversations = await refreshConversationsData(user.uid);
      testResults.push({
        test: 'Refresh Conversations',
        success: true,
        details: `Refreshed ${conversations.length} conversations`
      });
    } catch (error) {
      testResults.push({
        test: 'Refresh Conversations',
        success: false,
        details: `Error: ${(error as any)?.message || 'Unknown error'}`
      });
    }
    
    setSuperLikeTestResults(testResults);
    setSuperLikeTestRunning(false);
  };

  // Reset Super Likes for testing
  const resetSuperLikesForTest = async () => {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
      await resetSuperLikes(user.uid);
      // Refresh status
      const status = await getSuperLikeStatus(user.uid);
      setSuperLikeStatus(status);
    } catch (error) {
      console.error('Error resetting Super Likes:', error);
    }
  };

  // Force comprehensive app refresh
  const forceAppRefresh = async () => {
    const user = getCurrentUser();
    if (!user) return;
    
    setIsReconnecting(true);
    const timestamp = new Date().toISOString();
    
    try {
      setConnectionHistory(prev => [
        { timestamp, action: 'Starting comprehensive app refresh', success: true },
        ...prev
      ]);
      
      // Use the enhanced manual reconnect that includes app data refresh
      const success = await networkReconnectionManager.manualReconnect();
      
      setConnectionHistory(prev => [
        { 
          timestamp: new Date().toISOString(), 
          action: 'Comprehensive app refresh', 
          success
        },
        ...prev
      ]);
      
      // Re-run diagnostics to show updated status
      await runDiagnostics();
      
      // Refresh Super Like status if successful
      if (success) {
        try {
          const status = await getSuperLikeStatus(user.uid);
          setSuperLikeStatus(status);
        } catch (error) {
          console.warn('Failed to refresh Super Like status after app refresh:', error);
        }
      }
      
    } catch (error) {
      console.error('Error during comprehensive app refresh:', error);
      setConnectionHistory(prev => [
        { 
          timestamp: new Date().toISOString(), 
          action: `Error during app refresh: ${error}`, 
          success: false
        },
        ...prev
      ]);
    } finally {
      setIsReconnecting(false);
    }
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
        
        {renderSuperLikeSection()}
        
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
    color: '#0F172A',
  },
  historySuccess: {
    color: '#10B981',
  },
  historyFailure: {
    color: '#EF4444',
  },
});

export default NetworkDiagnosticsScreen; 