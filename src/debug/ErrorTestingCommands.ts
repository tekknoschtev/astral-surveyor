// Error Testing Commands - Debug commands for testing error handling scenarios
// Used to validate error recovery mechanisms and logging

import { getErrorService } from '../services/ErrorService.js';
import { getLogger, LogLevel } from '../services/LoggerService.js';
import { UIErrorBoundary } from '../ui/UIErrorBoundary.js';

export interface ErrorTestScenario {
    name: string;
    description: string;
    test: () => Promise<void> | void;
}

/**
 * Collection of error testing scenarios for validating error handling
 */
export class ErrorTestingCommands {
    private errorService = getErrorService();
    private logger = getLogger();

    /**
     * Get all available error test scenarios
     */
    getTestScenarios(): ErrorTestScenario[] {
        return [
            {
                name: 'chunk-generation-error',
                description: 'Simulate chunk generation failure',
                test: () => this.testChunkGenerationError()
            },
            {
                name: 'ui-render-error',
                description: 'Simulate UI rendering error',
                test: () => this.testUIRenderError()
            },
            {
                name: 'async-operation-error',
                description: 'Simulate async operation failure with retry',
                test: () => this.testAsyncOperationError()
            },
            {
                name: 'service-circuit-breaker',
                description: 'Test service circuit breaker pattern',
                test: () => this.testServiceCircuitBreaker()
            },
            {
                name: 'audio-service-degradation',
                description: 'Simulate audio service failure and graceful degradation',
                test: () => this.testAudioServiceDegradation()
            },
            {
                name: 'logging-stress-test',
                description: 'Generate multiple log entries to test logging system',
                test: () => this.testLoggingStressTest()
            }
        ];
    }

    /**
     * Run a specific test scenario by name
     */
    async runTestScenario(scenarioName: string): Promise<boolean> {
        const scenario = this.getTestScenarios().find(s => s.name === scenarioName);
        if (!scenario) {
            this.logger.warn('ErrorTesting', 'runTest', `Test scenario not found: ${scenarioName}`);
            return false;
        }

        this.logger.info('ErrorTesting', 'runTest', `Starting test scenario: ${scenario.description}`);
        
        try {
            await scenario.test();
            this.logger.info('ErrorTesting', 'runTest', `Test scenario completed: ${scenario.name}`);
            return true;
        } catch (error) {
            this.logger.error('ErrorTesting', 'runTest', `Test scenario failed: ${scenario.name}`, error as Error);
            return false;
        }
    }

    /**
     * Run all test scenarios
     */
    async runAllTests(): Promise<{ passed: number; failed: number; results: Array<{ name: string; success: boolean }> }> {
        const scenarios = this.getTestScenarios();
        const results: Array<{ name: string; success: boolean }> = [];
        let passed = 0;
        let failed = 0;

        this.logger.info('ErrorTesting', 'runAllTests', `Running ${scenarios.length} error test scenarios`);

        for (const scenario of scenarios) {
            const success = await this.runTestScenario(scenario.name);
            results.push({ name: scenario.name, success });
            
            if (success) {
                passed++;
            } else {
                failed++;
            }

            // Small delay between tests
            await this.delay(100);
        }

        this.logger.info('ErrorTesting', 'runAllTests', `Test suite completed. Passed: ${passed}, Failed: ${failed}`);
        return { passed, failed, results };
    }

    /**
     * Clear all error states and logs (for testing recovery)
     */
    clearErrorStates(): void {
        this.errorService.getDegradedServices().forEach(service => {
            this.errorService.markServiceRecovered(service);
        });
        
        this.logger.info('ErrorTesting', 'clearErrorStates', 'All error states cleared');
    }

    // Individual test scenarios

    private testChunkGenerationError(): void {
        // Simulate chunk generation error
        this.errorService.safeExecute(
            'ChunkManager', 
            'generateChunk(999, 999)', 
            () => {
                throw new Error('Simulated chunk generation failure - invalid coordinates');
            },
            null,
            'Test error: Chunk generation failed for testing purposes'
        );
    }

    private testUIRenderError(): void {
        // Simulate UI rendering error
        const uiErrorBoundary = new UIErrorBoundary(this.errorService);
        
        uiErrorBoundary.wrapComponent('TestComponent', () => {
            throw new Error('Simulated UI render failure');
        });

        uiErrorBoundary.dispose();
    }

    private async testAsyncOperationError(): Promise<void> {
        // Test async operation with retry
        await this.errorService.executeWithRetry(
            'TestService',
            'failingAsyncOperation',
            async () => {
                throw new Error('Simulated async operation failure');
            },
            2, // 2 retries
            100, // 100ms delay
            'Test error: Async operation failed for testing'
        );
    }

    private async testServiceCircuitBreaker(): Promise<void> {
        // Trigger multiple failures to open circuit breaker
        const serviceName = 'TestCircuitService';
        
        for (let i = 0; i < 5; i++) {
            this.errorService.executeIfServiceHealthy(
                serviceName,
                'testOperation',
                () => {
                    throw new Error(`Simulated circuit breaker test failure ${i + 1}`);
                },
                'Test error: Circuit breaker test failure'
            );
            
            await this.delay(50);
        }

        // Try once more - should be circuit broken
        const result = this.errorService.executeIfServiceHealthy(
            serviceName,
            'testOperation',
            () => 'Should not execute',
            'Service should be circuit broken'
        );

        if (result === null) {
            this.logger.info('ErrorTesting', 'testServiceCircuitBreaker', 'Circuit breaker working correctly - service blocked');
        } else {
            this.logger.warn('ErrorTesting', 'testServiceCircuitBreaker', 'Circuit breaker may not be working - operation executed');
        }
    }

    private testAudioServiceDegradation(): void {
        // Simulate audio service error
        this.errorService.reportError(
            'AudioService',
            'playDiscoverySound',
            new Error('Simulated audio hardware failure'),
            'Audio system temporarily unavailable due to hardware issues'
        );
    }

    private testLoggingStressTest(): void {
        // Generate various log levels
        this.logger.debug('TestService', 'stressTest', 'Debug message for stress testing');
        this.logger.info('TestService', 'stressTest', 'Info message for stress testing', { testData: 'sample' });
        this.logger.warn('TestService', 'stressTest', 'Warning message for stress testing');
        this.logger.error('TestService', 'stressTest', 'Error message for stress testing', new Error('Test error'));
        this.logger.critical('TestService', 'stressTest', 'Critical message for stress testing', new Error('Critical test error'));

        // Test rapid logging
        for (let i = 0; i < 10; i++) {
            this.logger.info('TestService', `rapidLog${i}`, `Rapid log entry ${i}`, { iteration: i });
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current error handling statistics for testing verification
     */
    getErrorStatistics(): {
        healthStatus: ReturnType<typeof this.errorService.getHealthStatus>;
        degradedServices: string[];
        recentErrors: ReturnType<typeof this.errorService.getRecentErrors>;
        logStatistics: ReturnType<typeof this.logger.getErrorStatistics>;
    } {
        return {
            healthStatus: this.errorService.getHealthStatus(),
            degradedServices: this.errorService.getDegradedServices(),
            recentErrors: this.errorService.getRecentErrors(),
            logStatistics: this.logger.getErrorStatistics()
        };
    }
}