/**
 * SportMonks API Syntax Examples
 * 
 * This file contains examples of correct syntax usage for SportMonks API v3
 * Reference: https://docs.sportmonks.com/v3/syntax
 */

/**
 * Example 1: Base field selection
 * Fetch only fields you need to reduce response size and improve speed
 * 
 * Real-world example: Select only fixture name
 */
export const exampleBaseFieldSelection = {
  select: "name",
  // Result: Only name field is returned (plus relation IDs for technical reasons)
  // Response:
  // {
  //   "data": {
  //     "name": "Celtic vs Rangers",
  //     "id": 18535517,
  //     "league_id": 501,  // Relation IDs included automatically
  //     "season_id": 19735
  //   }
  // }
};

/**
 * Example 1b: Multiple field selection
 * Select multiple fields on base entity
 */
export const exampleMultipleFieldSelection = {
  select: "name,starting_at,state",
  // Result: Only name, starting_at, and state fields are returned
};

/**
 * Example 2: Including relations
 * Include related data objects
 * 
 * Real-world example: Include participants (teams) for a fixture
 */
export const exampleIncludeRelations = {
  include: "participants",
  // Result: Includes participants array with team details
  // Response structure:
  // {
  //   "data": {
  //     "id": 19032598,
  //     "name": "Spain vs England",
  //     "participants": [
  //       {
  //         "id": 18645,
  //         "name": "England",
  //         "short_code": "ENG",
  //         "meta": { "location": "away", "winner": false }
  //       },
  //       {
  //         "id": 18710,
  //         "name": "Spain",
  //         "short_code": "ESP",
  //         "meta": { "location": "home", "winner": true }
  //       }
  //     ]
  //   }
  // }
};

/**
 * Example 2b: Multiple top-level includes
 * Include multiple relations (semicolon-separated)
 */
export const exampleMultipleIncludes = {
  include: "participants;league;venue",
  // Alternative (comma also works for top-level):
  // include: "participants,league,venue",
  // Result: Includes participants, league, and venue as separate top-level relations
};

/**
 * Example 3: Field filtering inside includes
 * Limit fields of included relations
 */
export const exampleFieldFilteringInIncludes = {
  include: "events:player_name,minute",
  filters: "eventTypes:14,18",
  // Result: 
  // - events relation included
  // - Only player_name and minute fields from events
  // - Filtered to event types 14 and 18
};

/**
 * Example 4: Nested includes (multi-level)
 * Chain includes for nested relations using dot (.) notation
 * 
 * Real-world example: Include events with player information
 */
export const exampleNestedIncludes = {
  include: "participants;events.player",
  // Result:
  // - participants array (teams)
  // - events array with nested player objects
  // Each event includes full player information:
  // {
  //   "id": 42683644,
  //   "player_id": 3298,
  //   "player_name": "Aaron Mooy",
  //   "minute": 73,
  //   "player": {
  //     "id": 3298,
  //     "name": "Aaron Mooy",
  //     "firstname": "Aaron",
  //     "lastname": "Mooy",
  //     "image_path": "https://cdn.sportmonks.com/images/soccer/players/2/3298.png",
  //     "height": 174,
  //     "weight": 68,
  //     "date_of_birth": "1990-09-15",
  //     "country_id": 98
  //   }
  // }
};

/**
 * Example 4b: Deep nested includes with field selection
 * Chain multiple levels and select specific fields
 */
export const exampleDeepNestedIncludes = {
  include: "events.player.country:name",
  // Result:
  // - events relation included
  // - player relation nested inside events
  // - country relation nested inside player
  // - Only name field from country
  // Useful for getting player's country name without full country object
};

/**
 * Example 5: Multiple filters
 * Combine multiple filters with semicolon
 */
export const exampleMultipleFilters = {
  filters: "bookmakers:23;markets:1,2,3",
  // Result:
  // - Filter by bookmaker ID 23
  // - Filter by market IDs 1, 2, and 3 (comma-separated)
};

/**
 * Example 6: Complex include with field selection
 * Combine multiple includes with field selection
 */
export const exampleComplexInclude = {
  include: "lineups:player_name,position;events:player_name,minute,type",
  // Result:
  // - lineups included with only player_name and position fields
  // - events included with only player_name, minute, and type fields
};

/**
 * Example 7: Using populate filter for bulk fetching
 * Disable includes and enable 1000 records per page
 */
export const examplePopulateFilter = {
  filters: "populate",
  // Result:
  // - All includes disabled
  // - Maximum 1000 records per page (vs default 25)
  // - Minimal payload size
};

/**
 * Example 8: Incremental sync with idAfter
 * Fetch only new records after a specific ID
 */
export const exampleIncrementalSync = {
  filters: "populate;idAfter:12345",
  // Result:
  // - Only records with ID > 12345
  // - No includes (populate)
  // - Efficient for incremental updates
};

/**
 * Example 9: Pagination with filters
 * Combine populate with pagination
 */
export const examplePagination = {
  filters: "populate;page:2,per_page:100",
  // Result:
  // - Page 2
  // - 100 records per page
  // - No includes
};

/**
 * Example 10: Real-world fixture fetch with optimized includes
 * Minimize payload by selecting only needed fields
 */
export const exampleOptimizedFixtureFetch = {
  include: "participants:name;league:name",
  select: "id,starting_at,state",
  // Result:
  // - Only id, starting_at, state from fixture
  // - Only name from participants
  // - Only name from league
  // - Much smaller payload than full includes
};

/**
 * Example 11: Lineups with optimized field selection
 * Real-world example: Celtic vs Rangers lineups with player and country info
 * 
 * Without field selection: ~100KB+ response
 * With field selection: ~20KB response (80% reduction!)
 */
export const exampleOptimizedLineups = {
  include: "lineups.player:display_name,image_path;lineups.player.country:name,image_path",
  // Result:
  // - lineups array
  // - player objects with only display_name and image_path
  // - country objects with only name and image_path
  // Response example:
  // {
  //   "lineups": [
  //     {
  //       "id": 296138906,
  //       "player_name": "Joe Hart",
  //       "player": {
  //         "id": 275,
  //         "display_name": "Joe Hart",
  //         "image_path": "https://cdn.sportmonks.com/images/soccer/players/19/275.png",
  //         "country": {
  //           "id": 462,
  //           "name": "United Kingdom",
  //           "image_path": "https://cdn.sportmonks.com/images/countries/png/short/gb.png"
  //         }
  //       }
  //     }
  //   ]
  // }
};

/**
 * Example 11: Odds fetch with bookmaker and market filters
 * Filter odds by specific bookmaker and markets
 */
export const exampleOddsWithFilters = {
  include: "market:name;bookmaker:name",
  filters: "bookmakers:23;markets:1,2,3",
  // Result:
  // - Only odds from bookmaker 23
  // - Only markets 1, 2, and 3
  // - Include market and bookmaker names only
};

/**
 * Example 12: Statistics with nested type details
 * Fetch statistics with nested type information
 */
export const exampleStatisticsWithTypes = {
  include: "statistics.type:name,developer_name",
  // Result:
  // - statistics relation included
  // - type relation nested inside statistics
  // - Only name and developer_name from type
};

/**
 * Common Syntax Patterns Summary:
 * 
 * 1. Field selection: select=field1,field2
 * 2. Top-level includes: include=relation1;relation2
 * 3. Field selection in includes: include=relation:field1,field2
 * 4. Nested includes: include=relation1.relation2:field
 * 5. Single filter: filters=filterName:value
 * 6. Multiple filter values: filters=filterName:value1,value2
 * 7. Multiple filters: filters=filter1:value1;filter2:value2
 * 8. Populate (bulk): filters=populate
 * 9. Incremental sync: filters=populate;idAfter:12345
 * 10. Pagination: filters=page:2,per_page:100
 */

