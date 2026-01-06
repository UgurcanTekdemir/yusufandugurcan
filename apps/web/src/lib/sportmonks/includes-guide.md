# SportMonks API Includes Guide

## Overview

The `include` parameter in the SportMonks Football API allows you to enrich your API responses by including related resources in a single request. By using includes, you can avoid making multiple API calls to gather related data, making your integrations more efficient and performant.

## Basic Usage

### Including Participants (Teams)

When querying a fixture, you can include the associated teams by adding the `include` parameter:

```typescript
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "participants",
});
```

**Response Structure**:
```json
{
  "data": {
    "id": 19032598,
    "sport_id": 1,
    "league_id": 1326,
    "name": "Spain vs England",
    "starting_at": "2024-07-14 19:00:00",
    "participants": [
      {
        "id": 18645,
        "name": "England",
        "short_code": "ENG",
        "image_path": "https://cdn.sportmonks.com/images/soccer/teams/21/18645.png",
        "meta": {
          "location": "away",
          "winner": false,
          "position": 2
        }
      },
      {
        "id": 18710,
        "name": "Spain",
        "short_code": "ESP",
        "image_path": "https://cdn.sportmonks.com/images/soccer/teams/22/18710.png",
        "meta": {
          "location": "home",
          "winner": true,
          "position": 1
        }
      }
    ]
  }
}
```

## Common Include Patterns

### 1. Multiple Top-Level Includes

Include multiple relations using semicolon (`;`) or comma (`,`) separator:

```typescript
// Semicolon (recommended for clarity)
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "participants;league;venue",
});

// Comma (also works)
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "participants,league,venue",
});
```

### 2. Field Selection in Includes

Limit fields of included relations using colon (`:`) and comma (`,`) for multiple fields:

```typescript
// Include only specific fields from participants
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "participants:name,short_code,image_path",
});
```

### 3. Nested Includes

Chain includes for nested relations using dot (`.`) notation. Nested includes allow you to enrich your data by requesting more information from a standard include.

**Basic Nested Include**:
```typescript
// Include events with player information
const fixture = await sportmonksClient.getFixtureById(18535517, {
  include: "participants;events.player",
});

// Response structure:
// {
//   "data": {
//     "id": 18535517,
//     "name": "Celtic vs Rangers",
//     "participants": [...],
//     "events": [
//       {
//         "id": 42683644,
//         "player_id": 3298,
//         "player_name": "Aaron Mooy",
//         "minute": 73,
//         "player": {
//           "id": 3298,
//           "name": "Aaron Mooy",
//           "firstname": "Aaron",
//           "lastname": "Mooy",
//           "image_path": "https://cdn.sportmonks.com/images/soccer/players/2/3298.png",
//           "height": 174,
//           "weight": 68,
//           "date_of_birth": "1990-09-15",
//           "country_id": 98
//         }
//       }
//     ]
//   }
// }
```

**Deep Nested Includes**:
```typescript
// Include events with player and player's country
const fixture = await sportmonksClient.getFixtureById(18535517, {
  include: "participants;events.player.country:name",
});

// Response includes:
// - events array
// - player object nested inside each event
// - country object nested inside player (only name field)
```

**Why Use Nested Includes?**
- Get complete player information (height, weight, age, image, country) in events
- Avoid multiple API calls to fetch player details separately
- Enrich event data with related player information

### 4. Complex Includes

Combine multiple includes with field selection and nested relations:

```typescript
// Include participants with limited fields, and league with name only
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "participants:name,short_code;league:name",
});

// Complex: Events with player info, but only specific player fields
const fixture = await sportmonksClient.getFixtureById(18535517, {
  include: "participants;events.player:name,image_path,height,weight;events.type:name",
});
// This includes:
// - Full participants array
// - Events with nested player objects (only name, image_path, height, weight)
// - Event types (only name field)
```

## Common Includes by Endpoint

### Fixtures Endpoint

**Available includes**:
- `participants` - Teams playing in the fixture
- `league` - League information
- `venue` - Stadium/venue details
- `state` - Match state (NS, LIVE, FT, etc.)
- `scores` - Match scores
- `events` - Match events (goals, cards, etc.)
- `lineups` - Team lineups
- `statistics` - Match statistics
- `odds` - Betting odds
- `odds.preMatch` - Pre-match odds
- `odds.inPlay` - In-play odds

**Example**:
```typescript
// Basic includes
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "participants;league;events;statistics.type",
});

// With nested includes for richer data
const fixture = await sportmonksClient.getFixtureById(18535517, {
  include: "participants;league;events.player;events.type",
});
// This includes:
// - participants (teams)
// - league information
// - events with full player objects
// - event types
```

### Teams Endpoint

**Available includes**:
- `country` - Team's country
- `venue` - Home venue
- `statistics` - Team statistics
- `statistics.details.type` - Statistics with type details

**Example**:
```typescript
const team = await sportmonksClient.getTeamById(18645, {
  include: "country;statistics.details.type",
  filters: "teamStatisticSeasons:21638",
});
```

### Players Endpoint

**Available includes**:
- `country` - Player's country
- `position` - Player position
- `statistics` - Player statistics
- `statistics.details.type` - Statistics with type details

**Example**:
```typescript
const player = await sportmonksClient.getPlayerById(997, {
  include: "country;statistics.details.type",
  filters: "playerStatisticSeasons:21638",
});
```

## Best Practices

### 1. Use Includes Sparingly

While includes are convenient, they increase payload size and response time. Consider:

- **Caching**: Cache reference entities (leagues, teams, countries) instead of including them every time
- **Field Selection**: Use field selection to limit included data: `participants:name,short_code`
- **Populate Filter**: Use `filters=populate` for bulk operations to disable includes

### 2. Optimize with Field Selection

Field selection allows you to request specific fields on entities, reducing response size and improving response speed. This is especially important for large responses.

**Base Entity Field Selection**:
```typescript
// ❌ Inefficient: All fixture fields
const fixture = await sportmonksClient.getFixtureById(18535517, {});

// ✅ Efficient: Only name field
const fixture = await sportmonksClient.getFixtureById(18535517, {
  select: "name",
});

// Response: Only name field returned (plus relation IDs for technical reasons)
// {
//   "data": {
//     "name": "Celtic vs Rangers",
//     "id": 18535517,
//     "league_id": 501,
//     "season_id": 19735,
//     // ... relation IDs only
//   }
// }
```

**Include Field Selection**:
```typescript
// ❌ Inefficient: Full participant objects
include: "participants"

// ✅ Efficient: Only needed fields
include: "participants:name,short_code,image_path"
```

**Nested Include Field Selection**:
```typescript
// ❌ Inefficient: Full player and country objects
include: "lineups.player;lineups.player.country"

// ✅ Efficient: Only specific fields
include: "lineups.player:display_name,image_path;lineups.player.country:name,image_path"

// Real-world example: Celtic vs Rangers lineups
// Response includes:
// - lineups array
// - player objects with only display_name and image_path
// - country objects with only name and image_path
// This drastically reduces response size!
```

### 3. Use Nested Includes Carefully

Nested includes can significantly increase payload size, but they're powerful for getting complete data in one request:

```typescript
// ❌ Heavy: Full nested objects
include: "events.player.country"

// ✅ Lighter: Only needed fields
include: "events.player.country:name"

// ✅ Good balance: Get player info but limit country fields
include: "events.player:name,image_path,height,weight;events.player.country:name"
```

**When to use nested includes**:
- ✅ You need complete player/team/entity information in events or lineups
- ✅ You want to avoid multiple API calls
- ✅ You're fetching detailed fixture information (not bulk operations)

**When to avoid nested includes**:
- ❌ Bulk operations (use `filters=populate` instead)
- ❌ List views where you only need basic information
- ❌ When you can cache reference entities instead

### 4. Combine with Filters

Use filters to narrow down included data:

```typescript
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "events:player_name,minute,type",
  filters: "eventTypes:14,18", // Only goals and cards
});
```

## Performance Considerations

### Payload Size Impact

| Include Pattern | Payload Size | Use Case |
|----------------|--------------|----------|
| No includes | ~1KB | Bulk operations, minimal data |
| `participants` | ~5KB | Basic fixture with teams |
| `participants;league;venue` | ~10KB | Full fixture details |
| `events;lineups;statistics` | ~50KB+ | Detailed match data |
| `events.player` | ~80KB+ | Events with player information |
| `events.player.country` | ~100KB+ | Deep nested includes |
| `events.player.country:name` | ~85KB | Deep nested with field selection (optimized) |

### Recommendations

1. **For List Views**: Use minimal includes or `filters=populate`
2. **For Detail Views**: Include only what's needed for that view
3. **For Bulk Operations**: Use `filters=populate` to disable includes
4. **For Cached Data**: Don't include reference entities, use cache instead

## Error Handling

Invalid includes will result in a 400 Bad Request:

```typescript
try {
  const fixture = await sportmonksClient.getFixtureById(19032598, {
    include: "invalid_relation", // ❌ Will cause 400 error
  });
} catch (error) {
  // Handle 400 Bad Request
  console.error("Invalid include parameter");
}
```

Always check the endpoint documentation for available includes.

## Examples in Our Codebase

### Fixtures List (Minimal Includes)

```typescript
// apps/web/src/app/api/sm/fixtures/date/route.ts
const fixtures = await sportmonksClient.getFixturesByDate(date, {
  include: "participants;league", // Only essential data
});
```

### Fixture Detail (Comprehensive Includes)

```typescript
// apps/web/src/app/api/sm/fixtures/[fixtureId]/route.ts
const fixture = await sportmonksClient.getFixtureById(fixtureId, {
  include: "participants;league;events.type;lineups.details.type;statistics.type",
});
```

### Fixture Detail with Nested Player Information

```typescript
// Include events with full player details
const fixture = await sportmonksClient.getFixtureById(fixtureId, {
  include: "participants;league;events.player;events.type;lineups.player",
});
// This provides:
// - Complete player information in events (height, weight, age, image, etc.)
// - Complete player information in lineups
// - Event types
```

### Odds with Bookmaker Filter

```typescript
// apps/web/src/lib/sportmonks/client.ts
const odds = await sportmonksClient.getPrematchOdds(fixtureId, {
  include: "market;bookmaker",
  filters: "bookmakers:23", // Bet365
});
```

## Reference

- [SportMonks API Documentation](https://docs.sportmonks.com/v3)
- [Includes Syntax Guide](./README.md#api-syntax-reference)
- [Syntax Examples](./syntax-examples.ts)

