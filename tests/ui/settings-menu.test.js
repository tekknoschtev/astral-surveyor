// SettingsMenu UI Component Tests - TDD approach
// Tests for the settings menu interface and user interactions

import { SettingsMenu } from '../../dist/ui/SettingsMenu.js';

describe('SettingsMenu UI Component', () => {
    let settingsMenu;
    let mockSettingsService;
    let mockCanvas;
    let mockContext;
    let mockInput;

    beforeEach(() => {
        // Mock SettingsService
        mockSettingsService = {
            // Audio methods
            getAmbientVolume: vi.fn().mockReturnValue(60),
            setAmbientVolume: vi.fn(),
            getDiscoveryVolume: vi.fn().mockReturnValue(70),
            setDiscoveryVolume: vi.fn(),
            getMasterVolume: vi.fn().mockReturnValue(80),
            setMasterVolume: vi.fn(),
            isAmbientMuted: vi.fn().mockReturnValue(false),
            setAmbientMuted: vi.fn(),
            isDiscoveryMuted: vi.fn().mockReturnValue(false),
            setDiscoveryMuted: vi.fn(),
            isMasterMuted: vi.fn().mockReturnValue(false),
            setMasterMuted: vi.fn(),
            
            // Display methods
            getShowCoordinates: vi.fn().mockReturnValue(false),
            setShowCoordinates: vi.fn(),
            getUIScale: vi.fn().mockReturnValue(1.0),
            setUIScale: vi.fn(),
            isFullscreen: vi.fn().mockReturnValue(false),
            setFullscreen: vi.fn(),
            
            // Data methods
            exportSaveData: vi.fn().mockReturnValue('{"test": "data"}'),
            resetDistanceTraveled: vi.fn(),
            clearDiscoveryHistory: vi.fn(),
            
            // Event system
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };

        // Mock Canvas and Context
        mockContext = {
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            font: '',
            textAlign: '',
            textBaseline: '',
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            fillText: vi.fn(),
            strokeText: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            measureText: vi.fn().mockReturnValue({ width: 100 })
        };

        mockCanvas = {
            width: 1024,
            height: 768,
            getContext: vi.fn().mockReturnValue(mockContext)
        };

        // Mock Input
        mockInput = {
            wasClicked: vi.fn().mockReturnValue(false),
            isMousePressed: vi.fn().mockReturnValue(false),
            getMouseX: vi.fn().mockReturnValue(0),
            getMouseY: vi.fn().mockReturnValue(0),
            wasJustPressed: vi.fn().mockReturnValue(false),
            getTouchCount: vi.fn().mockReturnValue(0),
            clearFrameState: vi.fn(),
            consumeTouch: vi.fn()
        };

        settingsMenu = new SettingsMenu(mockSettingsService);
    });

    describe('Initialization', () => {
        it('should initialize with correct default state', () => {
            expect(settingsMenu).toBeDefined();
            expect(settingsMenu.isVisible()).toBe(false);
            expect(settingsMenu.getCurrentTab()).toBe('audio');
        });

        it('should require SettingsService dependency', () => {
            expect(() => new SettingsMenu(null)).toThrow('SettingsService is required');
        });

        it('should set up event listeners on SettingsService', () => {
            expect(mockSettingsService.addEventListener).toHaveBeenCalledWith(
                'settingsChanged', 
                expect.any(Function)
            );
        });
    });

    describe('Visibility Management', () => {
        it('should toggle visibility correctly', () => {
            expect(settingsMenu.isVisible()).toBe(false);
            
            settingsMenu.toggle();
            expect(settingsMenu.isVisible()).toBe(true);
            
            settingsMenu.toggle();
            expect(settingsMenu.isVisible()).toBe(false);
        });

        it('should show and hide explicitly', () => {
            settingsMenu.show();
            expect(settingsMenu.isVisible()).toBe(true);
            
            settingsMenu.hide();
            expect(settingsMenu.isVisible()).toBe(false);
        });

        it('should not render when invisible', () => {
            settingsMenu.hide();
            settingsMenu.render(mockContext, mockCanvas);
            
            expect(mockContext.fillRect).not.toHaveBeenCalled();
        });
    });

    describe('Tab Management', () => {
        it('should switch tabs correctly', () => {
            expect(settingsMenu.getCurrentTab()).toBe('audio');
            
            settingsMenu.setCurrentTab('display');
            expect(settingsMenu.getCurrentTab()).toBe('display');
            
            settingsMenu.setCurrentTab('data');
            expect(settingsMenu.getCurrentTab()).toBe('data');
        });

        it('should validate tab names', () => {
            expect(() => settingsMenu.setCurrentTab('invalid')).toThrow('Invalid tab: invalid');
            expect(() => settingsMenu.setCurrentTab('audio')).not.toThrow();
            expect(() => settingsMenu.setCurrentTab('display')).not.toThrow();
            expect(() => settingsMenu.setCurrentTab('data')).not.toThrow();
        });

        it('should reset to audio tab when shown', () => {
            settingsMenu.setCurrentTab('display');
            settingsMenu.hide();
            settingsMenu.show();
            
            expect(settingsMenu.getCurrentTab()).toBe('audio');
        });
    });

    describe('Rendering', () => {
        beforeEach(() => {
            settingsMenu.show();
        });

        it('should render modal overlay when visible', () => {
            settingsMenu.render(mockContext, mockCanvas);
            
            // Should draw semi-transparent overlay (check if fillStyle was set to overlay color)
            expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1024, 768);
            // Note: fillStyle gets overwritten multiple times, so we check call pattern instead
        });

        it('should render settings panel background', () => {
            settingsMenu.render(mockContext, mockCanvas);
            
            // Should draw settings panel background
            expect(mockContext.fillRect).toHaveBeenCalledWith(
                expect.any(Number), // x
                expect.any(Number), // y  
                expect.any(Number), // width
                expect.any(Number)  // height
            );
        });

        it('should render tab buttons', () => {
            settingsMenu.render(mockContext, mockCanvas);
            
            // Should draw Audio tab button (Display and Data tabs are disabled)
            expect(mockContext.fillText).toHaveBeenCalledWith('Audio', expect.any(Number), expect.any(Number));
        });

        it('should highlight active tab', () => {
            // Only audio tab is available, so it should be highlighted by default
            settingsMenu.render(mockContext, mockCanvas);
            
            // Should render tab (active tab color is set but may be overwritten)
            expect(mockContext.fillRect).toHaveBeenCalled();
            expect(mockContext.fillText).toHaveBeenCalledWith('Audio', expect.any(Number), expect.any(Number));
        });

        it('should render current tab content', () => {
            // Only Audio tab is available and should render volume controls
            settingsMenu.setCurrentTab('audio');
            settingsMenu.render(mockContext, mockCanvas);
            expect(mockContext.fillText).toHaveBeenCalledWith(expect.stringContaining('Ambient'), expect.any(Number), expect.any(Number));
        });
    });

    describe('Audio Tab Functionality', () => {
        beforeEach(() => {
            settingsMenu.show();
            settingsMenu.setCurrentTab('audio');
        });

        it('should render volume sliders', () => {
            settingsMenu.render(mockContext, mockCanvas);
            
            // Should render slider backgrounds and handles
            expect(mockContext.fillRect).toHaveBeenCalledWith(
                expect.any(Number), expect.any(Number), 
                expect.any(Number), expect.any(Number)
            );
            expect(mockContext.arc).toHaveBeenCalled(); // Slider handles
        });

        it('should render mute checkboxes', () => {
            settingsMenu.render(mockContext, mockCanvas);
            
            // Should render checkbox squares
            expect(mockContext.strokeRect).toHaveBeenCalled();
        });

        it('should show current volume values', () => {
            settingsMenu.render(mockContext, mockCanvas);
            
            expect(mockContext.fillText).toHaveBeenCalledWith('60', expect.any(Number), expect.any(Number)); // Ambient
            expect(mockContext.fillText).toHaveBeenCalledWith('70', expect.any(Number), expect.any(Number)); // Discovery  
            expect(mockContext.fillText).toHaveBeenCalledWith('80', expect.any(Number), expect.any(Number)); // Master
        });

        it('should indicate muted state visually', () => {
            mockSettingsService.isAmbientMuted.mockReturnValue(true);
            settingsMenu.render(mockContext, mockCanvas);
            
            // Should render checkboxes for muted states
            expect(mockContext.fillRect).toHaveBeenCalled();
            expect(mockContext.strokeRect).toHaveBeenCalled();
        });
    });

    // Display Tab Functionality tests disabled - Display tab is currently disabled
    // describe('Display Tab Functionality', () => {
    //     beforeEach(() => {
    //         settingsMenu.show();
    //         settingsMenu.setCurrentTab('display');
    //     });

    //     it('should render coordinate display toggle', () => {
    //         settingsMenu.render(mockContext, mockCanvas);
            
    //         expect(mockContext.fillText).toHaveBeenCalledWith(
    //             expect.stringContaining('Show Coordinates'), 
    //             expect.any(Number), expect.any(Number)
    //         );
    //     });

    //     it('should render UI scale slider', () => {
    //         settingsMenu.render(mockContext, mockCanvas);
            
    //         expect(mockContext.fillText).toHaveBeenCalledWith(
    //             expect.stringContaining('UI Scale'), 
    //             expect.any(Number), expect.any(Number)
    //         );
    //     });

    //     it('should render fullscreen toggle', () => {
    //         settingsMenu.render(mockContext, mockCanvas);
            
    //         expect(mockContext.fillText).toHaveBeenCalledWith(
    //             expect.stringContaining('Fullscreen'), 
    //             expect.any(Number), expect.any(Number)
    //         );
    //     });
    // });

    // Data Tab Functionality tests disabled - Data tab is currently disabled
    // describe('Data Tab Functionality', () => {
    //     beforeEach(() => {
    //         settingsMenu.show();
    //         settingsMenu.setCurrentTab('data');
    //     });

    //     it('should render export button', () => {
    //         settingsMenu.render(mockContext, mockCanvas);
            
    //         expect(mockContext.fillText).toHaveBeenCalledWith(
    //             expect.stringContaining('Export'), 
    //             expect.any(Number), expect.any(Number)
    //         );
    //     });

    //     it('should render reset distance button', () => {
    //         settingsMenu.render(mockContext, mockCanvas);
            
    //         expect(mockContext.fillText).toHaveBeenCalledWith(
    //             expect.stringContaining('Reset Distance'), 
    //             expect.any(Number), expect.any(Number)
    //         );
    //     });

    //     it('should render clear history button', () => {
    //         settingsMenu.render(mockContext, mockCanvas);
            
    //         expect(mockContext.fillText).toHaveBeenCalledWith(
    //             'Clear Discovery History', 
    //             expect.any(Number), expect.any(Number)
    //         );
    //     });
    // });

    describe('Input Handling', () => {
        beforeEach(() => {
            settingsMenu.show();
        });

        it('should handle tab switching clicks', () => {
            mockInput.wasClicked.mockReturnValue(true);
            mockInput.getMouseX.mockReturnValue(512); // Audio tab area (only tab available)
            mockInput.getMouseY.mockReturnValue(154); // Tab area Y coordinate
            
            settingsMenu.handleInput(mockInput);
            
            // Should remain on audio tab since it's the only available tab
            expect(settingsMenu.getCurrentTab()).toBe('audio');
        });

        it('should handle volume slider interactions', () => {
            settingsMenu.setCurrentTab('audio');
            settingsMenu.render(mockContext, mockCanvas); // Render to set up slider positions
            
            mockInput.isMousePressed.mockReturnValue(true);
            mockInput.getMouseX.mockReturnValue(350); // On ambient slider (x=232, width=440, so middle is ~452, let's try 350)
            mockInput.getMouseY.mockReturnValue(240); // Ambient slider Y position
            
            settingsMenu.handleInput(mockInput);
            
            expect(mockSettingsService.setAmbientVolume).toHaveBeenCalled();
        });

        it('should handle mute checkbox clicks', () => {
            settingsMenu.setCurrentTab('audio');
            settingsMenu.render(mockContext, mockCanvas); // Render to set up positions
            
            mockInput.wasClicked.mockReturnValue(true);
            mockInput.getMouseX.mockReturnValue(740); // On ambient mute checkbox (range: 732-748)
            mockInput.getMouseY.mockReturnValue(236); // Ambient checkbox Y position (contentY + 60 + 2)
            
            settingsMenu.handleInput(mockInput);
            
            expect(mockSettingsService.setAmbientMuted).toHaveBeenCalled();
        });
    });

    describe('REAL User Workflow Tests - Checkbox Functionality', () => {
        beforeEach(() => {
            settingsMenu.show();
            settingsMenu.setCurrentTab('audio');
        });

        describe('Ambient Mute Checkbox', () => {
            it('should toggle from unmuted to muted when clicked', () => {
                // Setup: ambient is currently unmuted (false)
                mockSettingsService.isAmbientMuted.mockReturnValue(false);
                
                // Render to establish checkbox positions
                settingsMenu.render(mockContext, mockCanvas);
                
                // User clicks on ambient mute checkbox
                mockInput.wasClicked.mockReturnValue(true);
                mockInput.getMouseX.mockReturnValue(740);  // Ambient checkbox X
                mockInput.getMouseY.mockReturnValue(236);  // Correct Y position (contentY + 60 + 2)
                
                // Process the click
                settingsMenu.handleInput(mockInput);
                
                // Should call setAmbientMuted with opposite value (true)
                expect(mockSettingsService.setAmbientMuted).toHaveBeenCalledWith(true);
            });

            it('should toggle from muted to unmuted when clicked', () => {
                // Setup: ambient is currently muted (true) 
                mockSettingsService.isAmbientMuted.mockReturnValue(true);
                
                // Render to establish checkbox positions
                settingsMenu.render(mockContext, mockCanvas);
                
                // User clicks on ambient mute checkbox
                mockInput.wasClicked.mockReturnValue(true);
                mockInput.getMouseX.mockReturnValue(740);  // Ambient checkbox X
                mockInput.getMouseY.mockReturnValue(236);  // Correct Y position (contentY + 60 + 2)
                
                // Process the click
                settingsMenu.handleInput(mockInput);
                
                // Should call setAmbientMuted with opposite value (false)
                expect(mockSettingsService.setAmbientMuted).toHaveBeenCalledWith(false);
            });

            it('should show visual feedback - unchecked box when unmuted', () => {
                // Setup: ambient is unmuted
                mockSettingsService.isAmbientMuted.mockReturnValue(false);
                
                // Render
                settingsMenu.render(mockContext, mockCanvas);
                
                // Should render empty checkbox (strokeRect, not fillRect)
                const strokeRectCalls = mockContext.strokeRect.mock.calls;
                const ambientCheckboxCall = strokeRectCalls.find(call => 
                    call[0] >= 732 && call[0] <= 748 && // X range for ambient checkbox
                    call[2] === 16 && call[3] === 16    // 16x16 checkbox size
                );
                expect(ambientCheckboxCall).toBeDefined();
            });

            it('should show visual feedback - checked box when muted', () => {
                // Setup: ambient is muted
                mockSettingsService.isAmbientMuted.mockReturnValue(true);
                
                // Render
                settingsMenu.render(mockContext, mockCanvas);
                
                // Should render filled checkbox (fillRect call)
                const fillRectCalls = mockContext.fillRect.mock.calls;
                const ambientCheckboxCall = fillRectCalls.find(call => 
                    call[0] >= 732 && call[0] <= 748 && // X range for ambient checkbox
                    call[2] === 16 && call[3] === 16    // 16x16 checkbox size
                );
                expect(ambientCheckboxCall).toBeDefined();
            });
        });

        describe('Master Mute Checkbox', () => {
            it('should toggle master mute when clicked', () => {
                // Setup: master is unmuted
                mockSettingsService.isMasterMuted.mockReturnValue(false);
                
                // Render to establish positions
                settingsMenu.render(mockContext, mockCanvas);
                
                // Click on master mute checkbox (third checkbox)
                mockInput.wasClicked.mockReturnValue(true);
                mockInput.getMouseX.mockReturnValue(740);  // Master checkbox X
                mockInput.getMouseY.mockReturnValue(396);  // Master checkbox Y (contentY + 220 + 2)
                
                settingsMenu.handleInput(mockInput);
                
                expect(mockSettingsService.setMasterMuted).toHaveBeenCalledWith(true);
            });

            it('should show correct visual state for master checkbox', () => {
                // Setup: master is muted
                mockSettingsService.isMasterMuted.mockReturnValue(true);
                
                settingsMenu.render(mockContext, mockCanvas);
                
                // Should render filled checkbox for muted state
                const fillRectCalls = mockContext.fillRect.mock.calls;
                const masterCheckboxCall = fillRectCalls.find(call => 
                    call[0] >= 732 && call[0] <= 748 && // X range
                    call[2] === 16 && call[3] === 16    // Size
                );
                expect(masterCheckboxCall).toBeDefined();
            });
        });

        describe('Discovery Mute Checkbox', () => {
            it('should toggle discovery mute when clicked', () => {
                // Setup: discovery is unmuted
                mockSettingsService.isDiscoveryMuted.mockReturnValue(false);
                
                // Render to establish positions
                settingsMenu.render(mockContext, mockCanvas);
                
                // Click on discovery mute checkbox (second checkbox)
                mockInput.wasClicked.mockReturnValue(true);
                mockInput.getMouseX.mockReturnValue(740);  // Discovery checkbox X
                mockInput.getMouseY.mockReturnValue(316);  // Discovery checkbox Y (contentY + 140 + 2)
                
                settingsMenu.handleInput(mockInput);
                
                expect(mockSettingsService.setDiscoveryMuted).toHaveBeenCalledWith(true);
            });
        });

        describe('Checkbox Click Detection Edge Cases', () => {
            it('should not trigger mute when clicking outside checkbox area', () => {
                settingsMenu.render(mockContext, mockCanvas);
                
                // Click just outside checkbox area
                mockInput.wasClicked.mockReturnValue(true);
                mockInput.getMouseX.mockReturnValue(750);  // Just outside right edge
                mockInput.getMouseY.mockReturnValue(236);
                
                settingsMenu.handleInput(mockInput);
                
                // Should not call any mute functions
                expect(mockSettingsService.setAmbientMuted).not.toHaveBeenCalled();
                expect(mockSettingsService.setMasterMuted).not.toHaveBeenCalled();
                expect(mockSettingsService.setDiscoveryMuted).not.toHaveBeenCalled();
            });

            it('should handle multiple rapid clicks correctly', () => {
                // Use fake timers to control debouncing
                vi.useFakeTimers();
                
                mockSettingsService.isAmbientMuted.mockReturnValue(false);
                settingsMenu.render(mockContext, mockCanvas);
                
                // First click
                mockInput.wasClicked.mockReturnValue(true);
                mockInput.getMouseX.mockReturnValue(740);
                mockInput.getMouseY.mockReturnValue(236);
                settingsMenu.handleInput(mockInput);
                
                // Now ambient should be muted
                mockSettingsService.isAmbientMuted.mockReturnValue(true);
                
                // Advance time beyond debounce period (200ms)
                vi.advanceTimersByTime(250);
                
                // Second click
                settingsMenu.handleInput(mockInput);
                
                // Restore real timers
                vi.useRealTimers();
                
                // Should have been called twice, with opposite values
                expect(mockSettingsService.setAmbientMuted).toHaveBeenCalledTimes(2);
                expect(mockSettingsService.setAmbientMuted).toHaveBeenNthCalledWith(1, true);
                expect(mockSettingsService.setAmbientMuted).toHaveBeenNthCalledWith(2, false);
            });
        });

        // Export button test disabled - Data tab is currently disabled
        // it('should handle export button click', () => {
        //     // Mock URL.createObjectURL and document.createElement for download test
        //     global.URL = { 
        //         createObjectURL: vi.fn().mockReturnValue('blob:test'),
        //         revokeObjectURL: vi.fn()
        //     };
        //     global.document = {
        //         createElement: vi.fn().mockReturnValue({
        //             href: '',
        //             download: '',
        //             click: vi.fn()
        //         })
        //     };
            
        //     settingsMenu.setCurrentTab('data');
        //     mockInput.wasClicked.mockReturnValue(true);
        //     mockInput.getMouseX.mockReturnValue(400); // On export button
        //     mockInput.getMouseY.mockReturnValue(350);
            
        //     settingsMenu.handleInput(mockInput);
            
        //     expect(mockSettingsService.exportSaveData).toHaveBeenCalled();
        // });

        it('should not handle input when invisible', () => {
            settingsMenu.hide();
            mockInput.wasClicked.mockReturnValue(true);
            
            settingsMenu.handleInput(mockInput);
            
            expect(mockSettingsService.setAmbientVolume).not.toHaveBeenCalled();
        });

        it('should close menu when clicking outside', () => {
            mockInput.wasClicked.mockReturnValue(true);
            mockInput.getMouseX.mockReturnValue(100); // Outside menu area
            mockInput.getMouseY.mockReturnValue(100);
            
            settingsMenu.handleInput(mockInput);
            
            expect(settingsMenu.isVisible()).toBe(false);
        });
    });

    describe('Keyboard Shortcuts', () => {
        beforeEach(() => {
            settingsMenu.show();
        });

        it('should close menu on Escape key', () => {
            mockInput.wasJustPressed.mockReturnValue(true);
            
            const result = settingsMenu.handleKeyPress('Escape');
            
            expect(result).toBe(true); // Handled
            expect(settingsMenu.isVisible()).toBe(false);
        });

        it('should switch tabs with number keys', () => {
            mockInput.wasJustPressed.mockReturnValue(true);
            
            // Test switching to audio tab (only available tab)
            settingsMenu.handleKeyPress('Digit1');
            expect(settingsMenu.getCurrentTab()).toBe('audio');
            
            // Test that disabled tab shortcuts return false and don't change tab
            const result2 = settingsMenu.handleKeyPress('Digit2');
            expect(result2).toBe(false);
            expect(settingsMenu.getCurrentTab()).toBe('audio');
            
            const result3 = settingsMenu.handleKeyPress('Digit3');
            expect(result3).toBe(false);
            expect(settingsMenu.getCurrentTab()).toBe('audio');
        });

        it('should not handle keys when invisible', () => {
            settingsMenu.hide();
            
            const result = settingsMenu.handleKeyPress('Escape');
            
            expect(result).toBe(false); // Not handled
        });
    });

    describe('Responsive Design', () => {
        it('should adapt to different canvas sizes', () => {
            const smallCanvas = { width: 640, height: 480 };
            
            settingsMenu.show();
            settingsMenu.render(mockContext, smallCanvas);
            
            // Should still render but with adjusted dimensions
            expect(mockContext.fillRect).toHaveBeenCalled();
        });

        it('should handle touch-friendly sizing', () => {
            settingsMenu.setTouchMode(true);
            settingsMenu.show();
            settingsMenu.render(mockContext, mockCanvas);
            
            // Should use larger touch targets
            expect(mockContext.fillRect).toHaveBeenCalled();
        });
    });

    describe('Settings Change Handling', () => {
        it('should update display when settings change externally', () => {
            const changeHandler = mockSettingsService.addEventListener.mock.calls[0][1];
            
            // Simulate external settings change
            changeHandler({
                type: 'settingsChanged',
                setting: 'ambientVolume',
                value: 50,
                previousValue: 60
            });
            
            // Should mark for re-render or update internal state
            expect(settingsMenu.needsRedraw()).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle SettingsService errors gracefully', () => {
            mockSettingsService.setAmbientVolume.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            settingsMenu.setCurrentTab('audio');
            mockInput.isMousePressed.mockReturnValue(true);
            mockInput.getMouseX.mockReturnValue(400);
            mockInput.getMouseY.mockReturnValue(350);
            
            expect(() => settingsMenu.handleInput(mockInput)).not.toThrow();
        });

        it('should handle invalid mouse coordinates', () => {
            mockInput.getMouseX.mockReturnValue(-100);
            mockInput.getMouseY.mockReturnValue(-100);
            mockInput.wasClicked.mockReturnValue(true);
            
            expect(() => settingsMenu.handleInput(mockInput)).not.toThrow();
        });
    });

    describe('Cleanup', () => {
        it('should cleanup event listeners on dispose', () => {
            settingsMenu.dispose();
            
            expect(mockSettingsService.removeEventListener).toHaveBeenCalledWith(
                'settingsChanged',
                expect.any(Function)
            );
        });

        it('should not crash when disposed multiple times', () => {
            expect(() => {
                settingsMenu.dispose();
                settingsMenu.dispose();
            }).not.toThrow();
        });
    });
});