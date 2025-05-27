/**
 * FirestoreOperationQueue - Manages Firestore operations to prevent concurrency issues
 * 
 * This system helps prevent "INTERNAL ASSERTION FAILED" errors by:
 * 1. Limiting concurrent Firestore operations during app startup
 * 2. Ensuring operations are performed sequentially when needed
 * 3. Adding delay between operations to allow the Firestore client to stabilize
 */

import { Platform } from 'react-native';
import { refreshFirestoreConnection } from './config';

type QueuedOperation = {
  id: string;
  operation: () => Promise<any>;
  priority: number; // Higher number = higher priority
  resolve: (value: any) => void;
  reject: (error: any) => void;
};

class FirestoreOperationQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing: boolean = false;
  private operationCounter: number = 0;
  private isInitializing: boolean = true;
  private lastOperationTime: number = 0;
  private concurrentLimit: number = 1; // Start with just 1 concurrent operation during init
  
  // Operations in progress
  private activeOperations: Map<string, boolean> = new Map();
  
  constructor() {
    console.log('Firestore operation queue initialized');
    
    // After 10 seconds, consider initialization complete and increase concurrent limit
    setTimeout(() => {
      this.isInitializing = false;
      this.concurrentLimit = Platform.OS === 'web' ? 10 : 5;
      console.log(`Firestore initialization phase complete, concurrent operation limit set to ${this.concurrentLimit}`);
      
      // Process any pending operations more aggressively
      this.processQueue();
    }, 10000);
  }
  
  /**
   * Enqueue a Firestore operation to be executed when safe
   * @param operation Function that returns a Promise for the Firestore operation
   * @param priority Higher number = higher priority (default: 0)
   * @returns Promise that resolves with the operation result
   */
  enqueue<T>(operation: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `op_${++this.operationCounter}`;
      
      this.queue.push({
        id,
        operation,
        priority,
        resolve,
        reject
      });
      
      // Sort queue by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      // Start processing if not already
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Process the queue of operations
   */
  private processQueue = async () => {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      while (this.queue.length > 0) {
        // Check if we're at the concurrent limit
        if (this.activeOperations.size >= this.concurrentLimit) {
          // Wait for some operations to complete
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }
        
        // Get the next operation
        const nextOp = this.queue.shift();
        if (!nextOp) continue;
        
        // Rate limiting during initialization phase
        if (this.isInitializing) {
          const now = Date.now();
          const timeSinceLastOp = now - this.lastOperationTime;
          
          // Ensure at least 100ms between operations during init
          if (timeSinceLastOp < 100) {
            await new Promise(resolve => setTimeout(resolve, 100 - timeSinceLastOp));
          }
          
          this.lastOperationTime = Date.now();
        }
        
        // Mark as active
        this.activeOperations.set(nextOp.id, true);
        
        // Execute operation without awaiting
        this.executeOperation(nextOp).finally(() => {
          // Remove from active operations
          this.activeOperations.delete(nextOp.id);
        });
      }
    } finally {
      this.isProcessing = false;
      
      // If there are new operations, process them
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  };
  
  /**
   * Execute a single operation
   */
  private executeOperation = async (op: QueuedOperation) => {
    try {
      // Execute the operation
      const result = await op.operation();
      op.resolve(result);
    } catch (error) {
      console.error(`Error in queued Firestore operation ${op.id}:`, error);
      
      // If this is during initialization and looks like a connection issue,
      // try refreshing the connection
      if (this.isInitializing && 
          (error?.message?.includes('INTERNAL ASSERTION FAILED') ||
           error?.code === 'unavailable')) {
        console.log('Connection issue during initialization, attempting refresh...');
        
        try {
          await refreshFirestoreConnection();
          
          // Retry the operation
          try {
            const retryResult = await op.operation();
            op.resolve(retryResult);
            return;
          } catch (retryError) {
            console.error('Retry failed after connection refresh:', retryError);
            op.reject(retryError);
          }
        } catch (refreshError) {
          console.error('Connection refresh failed:', refreshError);
          op.reject(error); // Reject with original error
        }
      } else {
        op.reject(error);
      }
    }
  };
  
  /**
   * Emergency flush all pending operations (used during app shutdown)
   */
  flushQueue() {
    // Reject all pending operations
    this.queue.forEach(op => {
      op.reject(new Error('Operation cancelled - queue flushed'));
    });
    
    // Clear the queue
    this.queue = [];
    this.isProcessing = false;
  }
  
  /**
   * Get the current status of the operation queue
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeOperations: this.activeOperations.size,
      isInitializing: this.isInitializing,
      concurrentLimit: this.concurrentLimit
    };
  }
}

// Export a singleton instance
export const firestoreQueue = new FirestoreOperationQueue();

/**
 * Wrapper function to safely execute Firestore operations through the queue
 * @param operation Function that returns a Promise for the Firestore operation
 * @param priority Higher number = higher priority (default: 0)
 * @returns Promise that resolves with the operation result
 */
export const safeFirestoreOperation = <T>(
  operation: () => Promise<T>, 
  priority: number = 0
): Promise<T> => {
  return firestoreQueue.enqueue(operation, priority);
}; 