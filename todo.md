# <¯ Expansion Front - TODO List

**Last Updated:** 2025-12-13
**Project Status:** Active Development - Alpha Phase

---

## =4 High Priority

### Critical Bugs & Issues
- [ ] **Verify all systems work after data consolidation**
  - Test mining system with consolidated data.json
  - Test recipe production chains
  - Verify technology research works correctly
  - Test combat system functionality

### Essential Features
- [ ] **Complete Region System**
  - Currently: 10 regions implemented
  - Target: 20 regions as per design doc
  - Add regions 11-20 with progressive difficulty
  - Add final boss encounters (regions 15, 20)

- [ ] **Balance Testing**
  - Test progression through all 10 current regions
  - Verify resource production rates are balanced
  - Check power generation vs consumption balance
  - Test combat difficulty curve

---

## =á Medium Priority - Core Features

### Game Systems

#### Technology Tree
- [ ] Verify all 27 technologies unlock correctly
- [ ] Test technology prerequisites chain
- [ ] Verify Factorio-style continuous science consumption works
- [ ] Add visual feedback when technology completes
- [ ] Test all technology unlocks (buildings, recipes)

#### Combat System
- [ ] Test automated combat with all 6 unit types
- [ ] Verify unit type counters work (2x damage bonuses)
- [ ] Test ammunition consumption mechanics
- [ ] Verify retreat mechanics
- [ ] Test all 14 enemy types
- [ ] Implement BOSS battle UI enhancements
- [ ] Add combat statistics tracking

#### Region Progression
- [ ] Test region conquest flow
- [ ] Verify region switching works correctly (fixed bug #5)
- [ ] Add region difficulty scaling
- [ ] Implement resource node depletion warnings
- [ ] Add region-specific rewards

#### Power Management
- [ ] Test day/night cycle (5 min real-time)
- [ ] Verify solar panel day/night switching
- [ ] Test power priority system
- [ ] Add low power warnings and notifications
- [ ] Verify battery charging/discharging logic

### UI/UX Improvements
- [ ] **Fix interface flickering issues**
  - Verify all screens use lightweight update functions
  - Ensure no full DOM rebuilds in game loop
  - Test hover states don't flicker

- [ ] **Add missing UI elements**
  - Power consumption breakdown panel
  - Production statistics dashboard
  - Resource flow visualization
  - Building efficiency indicators

- [ ] **Improve user feedback**
  - Add sound effects (optional)
  - Improve toast notification system
  - Add building pulse animations on production complete
  - Better visual feedback for tech completion

---

## =â Low Priority - Enhancement & Polish

### Content Expansion

#### Add More Regions (11-20)
- [ ] Region 11: Advanced industrial zone
- [ ] Region 12-14: High-tech resource zones
- [ ] Region 15: BOSS - Nest Mother
- [ ] Region 16-19: End-game content zones
- [ ] Region 20: Final BOSS - Bug Overlord (3 phases)

#### Additional Technologies
- [ ] Add more automation technologies
- [ ] Add advanced power technologies (fusion)
- [ ] Add late-game military technologies
- [ ] Add utility technologies (faster research, better efficiency)

#### More Enemy Types
- [ ] Add elite enemy variants
- [ ] Add environmental hazards
- [ ] Implement enemy special abilities
- [ ] Add rare enemy spawns with better rewards

#### Extended Recipe Chains
- [ ] Add more intermediate components
- [ ] Add late-game exotic materials
- [ ] Add optional efficiency recipes
- [ ] Add recycling recipes

### Quality of Life Features
- [ ] **Tutorial System**
  - Add interactive tutorial for new players
  - Add tooltip system
  - Add in-game help panel
  - Create quick reference overlay

- [ ] **Save/Load Enhancements**
  - Add save file naming
  - Add multiple save slots UI
  - Add auto-save interval settings
  - Add export/import save files

- [ ] **Settings Panel**
  - Add game speed control
  - Add graphics quality settings
  - Add UI scale options
  - Add color theme customization

- [ ] **Statistics & Analytics**
  - Add production statistics page
  - Add resource consumption graphs
  - Add combat performance metrics
  - Add playtime tracker

### Performance Optimization
- [ ] Profile game loop performance
- [ ] Optimize DOM updates
- [ ] Implement object pooling for combat
- [ ] Add performance monitoring overlay (debug mode)
- [ ] Optimize large-scale production calculations

### Visual Polish
- [ ] Add particle effects for production
- [ ] Improve building animations
- [ ] Add combat visual effects
- [ ] Enhance theme color transitions
- [ ] Add background animations (optional)

---

## =ñ Platform & Compatibility

### Mobile Support
- [ ] Test on mobile browsers
- [ ] Add touch controls
- [ ] Implement responsive layout for mobile
- [ ] Optimize for smaller screens
- [ ] Add mobile-specific UI adjustments

### Browser Compatibility
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on Edge
- [ ] Fix any browser-specific issues

---

## >ê Testing & Validation

### Automated Testing
- [ ] Expand test coverage in `tests/validate_data.js`
- [ ] Add unit tests for core game functions
- [ ] Add integration tests for production chains
- [ ] Add combat simulation tests
- [ ] Set up continuous testing

### Manual Testing Checklist
- [ ] Test full game progression (region 1 ’ 10)
- [ ] Test all building types
- [ ] Test all recipe chains
- [ ] Test all technologies
- [ ] Test all combat scenarios
- [ ] Test save/load functionality
- [ ] Test edge cases (resource overflow, power outage, etc.)

### Balance Testing
- [ ] Region 1-5: Early game balance
- [ ] Region 6-10: Mid game balance
- [ ] Technology unlock pacing
- [ ] Resource production rates
- [ ] Combat difficulty scaling
- [ ] Power generation progression

---

## =Ú Documentation

### Code Documentation
- [ ] Add JSDoc comments to main functions
- [ ] Document game state structure
- [ ] Document data.json schema
- [ ] Create API reference for modding

### User Documentation
- [ ] Create player's guide
- [ ] Add strategy tips
- [ ] Create FAQ
- [ ] Add troubleshooting guide

### Developer Documentation
- [ ] Update DEVELOPER_MANUAL.md with new patterns
- [ ] Document recent bug fixes
- [ ] Add architecture diagrams
- [ ] Create contribution guide

---

## =€ Future Features (Post-MVP)

### Endless Mode
- [ ] Design endless mode progression
- [ ] Implement infinite region generation
- [ ] Add endless mode scoring system
- [ ] Add leaderboards

### Advanced Systems
- [ ] Blueprint system (save building layouts)
- [ ] Automation improvements (conveyor belts)
- [ ] Module system (building upgrades)
- [ ] Research queue

### Multiplayer (Long-term)
- [ ] Research multiplayer architecture
- [ ] Implement shared resources
- [ ] Add cooperative gameplay
- [ ] Add competitive modes

### Content Packs
- [ ] Design modding system
- [ ] Create mod loader
- [ ] Document modding API
- [ ] Create example mods

---

## = Known Issues

### Active Bugs
- [x] ~~Interface flickering on hover~~ (Fixed - using lightweight updates)
- [x] ~~Region switching shows wrong buildings~~ (Fixed - force clear container)
- [ ] Progress bars continue when blocked (needs verification)
- [ ] Science consumption edge cases (very low amounts)

### Potential Issues to Investigate
- [ ] Memory leaks in long play sessions
- [ ] Combat performance with many units
- [ ] Save file size growth over time
- [ ] Resource calculation precision errors

---

##  Recently Completed

### December 13, 2025
- [x] Consolidated 7 JSON files into single data.json
- [x] Created comprehensive documentation structure
- [x] Created overview.md as documentation catalog
- [x] Renamed design docs to English
- [x] Organized old documentation into archive
- [x] Updated README.md with new structure
- [x] Fixed documentation cross-references

### December 7, 2025
- [x] Simplified military system (all units from assemblers)
- [x] Increased building slots to 16 per region
- [x] Implemented 10x research speed for debugging
- [x] Fixed Factorio-style science consumption
- [x] Updated DEVELOPER_MANUAL with latest info

### December 4, 2025
- [x] Updated combat system design to v2.0
- [x] Implemented automated real-time combat

### December 3, 2025
- [x] Fixed building status update flickering
- [x] Fixed power status display issues
- [x] Separated full DOM rebuild from lightweight updates

### December 2, 2025
- [x] Implemented recipe production system
- [x] Created multi-color theme system
- [x] Fixed data consolidation

---

## =Ë Notes for Developers

### Development Priorities
1. **Stability First**: Fix critical bugs before adding features
2. **Test Coverage**: Always test new features thoroughly
3. **Documentation**: Update docs when implementing features
4. **Performance**: Profile before optimizing

### Code Standards
- Use meaningful variable names
- Comment complex logic
- Update DEVELOPER_MANUAL when adding patterns
- Run `node tests/validate_data.js` before committing
- Test in browser before committing

### Git Workflow
```bash
# Before starting work
git pull origin main

# Create feature branch (optional)
git checkout -b feature/your-feature-name

# Make changes, test thoroughly
./run.sh  # Test in browser

# Validate data if you changed data.json
node tests/validate_data.js

# Commit with meaningful message
git add .
git commit -m "feat: description of what you added"

# Push changes
git push origin main
```

---

## <¯ Sprint Goals

### Current Sprint (Week of Dec 13-20)
- [ ] Complete documentation consolidation  (Done!)
- [ ] Test all existing systems work correctly
- [ ] Fix any critical bugs found
- [ ] Begin work on regions 11-15

### Next Sprint (Week of Dec 21-27)
- [ ] Complete regions 11-15 implementation
- [ ] Add BOSS 15 encounter
- [ ] Balance test mid-to-late game
- [ ] Add missing UI feedback elements

### Future Sprint Ideas
- Tutorial system implementation
- Mobile optimization sprint
- Performance optimization sprint
- Content expansion sprint (regions 16-20)

---

**Legend:**
- =4 High Priority - Work on these first
- =á Medium Priority - Important but not urgent
- =â Low Priority - Nice to have
- [x] Completed
- [ ] Todo

**Need help?** Check [doc/overview.md](doc/overview.md) for documentation or [doc/DEVELOPER_MANUAL.md](doc/DEVELOPER_MANUAL.md) for technical reference.

---

*Keep this file updated as tasks are completed and new priorities emerge!*
