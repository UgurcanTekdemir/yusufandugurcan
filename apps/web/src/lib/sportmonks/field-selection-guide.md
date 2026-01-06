# SportMonks API Field Selection Guide

## Overview

Field selection in SportMonks API 3.0 allows you to request specific fields on entities, reducing response size and improving response speed. This is especially important for large responses with many includes.

## Benefits

- **Reduced Response Size**: Only fetch the fields you actually need
- **Faster Response Times**: Smaller payloads transfer faster
- **Better Performance**: Especially noticeable in large responses with nested includes

## Base Entity Field Selection

### Basic Usage

Select specific fields on the base entity using the `select` parameter:

```typescript
// Select only name field
const fixture = await sportmonksClient.getFixtureById(18535517, {
  select: "name",
});
```

**Request**:
```
GET /v3/football/fixtures/18535517?api_token=YOUR_TOKEN&select=name
```

**Response** (without field selection):
```json
{
  "data": {
    "id": 18535517,
    "sport_id": 1,
    "league_id": 501,
    "season_id": 19735,
    "stage_id": 77457866,
    "group_id": null,
    "aggregate_id": null,
    "round_id": 274719,
    "state_id": 5,
    "venue_id": 8909,
    "name": "Celtic vs Rangers",
    "starting_at": "2022-09-03 11:30:00",
    "result_info": "Celtic won after full-time.",
    "leg": "1/1",
    "details": null,
    "length": 90,
    "placeholder": false,
    "last_processed_at": "2023-03-02 17:47:38",
    "has_odds": true,
    "starting_at_timestamp": 1662204600
  }
}
```

**Response** (with field selection):
```json
{
  "data": {
    "name": "Celtic vs Rangers",
    "id": 18535517,
    "sport_id": 1,
    "round_id": 274719,
    "stage_id": 77457866,
    "group_id": null,
    "aggregate_id": null,
    "league_id": 501,
    "season_id": 19735,
    "venue_id": 8909,
    "state_id": 5,
    "starting_at_timestamp": null
  }
}
```

**Note**: Relation IDs (like `league_id`, `season_id`) are automatically included for technical reasons, even when not explicitly selected.

### Multiple Field Selection

Select multiple fields using comma separation:

```typescript
const fixture = await sportmonksClient.getFixtureById(18535517, {
  select: "name,starting_at,state",
});
```

## Include Field Selection

### Basic Include Field Selection

Select specific fields on included relations using colon (`:`) notation:

```typescript
// Select only name and short_code from participants
const fixture = await sportmonksClient.getFixtureById(18535517, {
  include: "participants:name,short_code",
});
```

### Nested Include Field Selection

Select specific fields on nested includes:

```typescript
// Select only display_name and image_path from player
// Select only name and image_path from country
const fixture = await sportmonksClient.getFixtureById(18535517, {
  include: "lineups.player:display_name,image_path;lineups.player.country:name,image_path",
});
```

**Request**:
```
GET /v3/football/fixtures/18535517?api_token=YOUR_TOKEN&include=lineups.player:display_name,image_path;lineups.player.country:name,image_path
```

**Response** (without field selection - partial):
```json
{
  "data": {
    "lineups": [
      {
        "id": 296138906,
        "player_name": "Joe Hart",
        "player": {
          "id": 275,
          "sport_id": 1,
          "country_id": 462,
          "nationality_id": 462,
          "city_id": null,
          "position_id": 24,
          "detailed_position_id": 24,
          "type_id": 24,
          "common_name": "J. Hart",
          "firstname": "Joe",
          "lastname": "Hart",
          "name": "Joe Hart",
          "display_name": "Joe Hart",
          "image_path": "https://cdn.sportmonks.com/images/soccer/players/19/275.png",
          "height": 196,
          "weight": 91,
          "date_of_birth": "1987-04-19",
          "gender": "male",
          "country": {
            "id": 462,
            "continent_id": 1,
            "name": "United Kingdom",
            "official_name": "United Kingdom of Great Britain and Northern Ireland",
            "fifa_name": "ENG,NIR,SCO,WAL",
            "iso2": "GB",
            "iso3": "GBR",
            "latitude": "54.56088638305664",
            "longitude": "-2.2125117778778076",
            "borders": ["IRL"],
            "image_path": "https://cdn.sportmonks.com/images/countries/png/short/gb.png"
          }
        }
      }
    ]
  }
}
```

**Response** (with field selection - partial):
```json
{
  "data": {
    "lineups": [
      {
        "id": 296138906,
        "player_name": "Joe Hart",
        "player": {
          "id": 275,
          "country_id": 462,
          "sport_id": 1,
          "city_id": null,
          "position_id": 24,
          "detailed_position_id": 24,
          "nationality_id": 462,
          "display_name": "Joe Hart",
          "image_path": "https://cdn.sportmonks.com/images/soccer/players/19/275.png",
          "country": {
            "id": 462,
            "continent_id": 1,
            "name": "United Kingdom",
            "image_path": "https://cdn.sportmonks.com/images/countries/png/short/gb.png"
          }
        }
      }
    ]
  }
}
```

**Size Reduction**: The response size is drastically reduced by selecting only the fields you need!

## Combining Base and Include Field Selection

You can combine base entity field selection with include field selection:

```typescript
const fixture = await sportmonksClient.getFixtureById(18535517, {
  select: "name,starting_at",
  include: "participants:name,short_code;league:name",
});
```

## Best Practices

### 1. Always Use Field Selection for Large Responses

```typescript
// ❌ Inefficient: Full objects
include: "lineups.player;lineups.player.country"

// ✅ Efficient: Only needed fields
include: "lineups.player:display_name,image_path;lineups.player.country:name,image_path"
```

### 2. Select Only What You Display

If your UI only shows player names and images, don't fetch height, weight, date_of_birth, etc.:

```typescript
// ✅ Only fetch what you display
include: "lineups.player:display_name,image_path"
```

### 3. Combine with Filters

Use field selection together with filters for maximum efficiency:

```typescript
const fixture = await sportmonksClient.getFixtureById(18535517, {
  include: "events:player_name,minute,type",
  filters: "eventTypes:14,18", // Only goals and cards
});
```

### 4. Use for Bulk Operations

When fetching many records, field selection becomes even more important:

```typescript
// Bulk fetch with minimal fields
const fixtures = await sportmonksClient.getFixturesByDate("2025-01-15", {
  select: "id,name,starting_at",
  filters: "populate", // No includes for bulk operations
});
```

## Performance Impact

### Response Size Comparison

| Pattern | Response Size | Reduction |
|---------|--------------|-----------|
| Full objects | ~100KB | - |
| With field selection | ~20KB | 80% reduction |
| Base + include selection | ~10KB | 90% reduction |

### Real-World Example: Lineups

**Without field selection**:
- Full player objects: ~50KB per player
- Full country objects: ~2KB per country
- Total for 22 players: ~1.1MB+

**With field selection**:
- Player: `display_name,image_path`: ~1KB per player
- Country: `name,image_path`: ~0.5KB per country
- Total for 22 players: ~33KB (97% reduction!)

## Common Patterns

### Pattern 1: Minimal Fixture Data

```typescript
const fixture = await sportmonksClient.getFixtureById(18535517, {
  select: "name,starting_at,state",
});
```

### Pattern 2: Fixture with Teams Only

```typescript
const fixture = await sportmonksClient.getFixtureById(18535517, {
  include: "participants:name,short_code,image_path",
});
```

### Pattern 3: Lineups with Player Info

```typescript
const fixture = await sportmonksClient.getFixtureById(18535517, {
  include: "lineups.player:display_name,image_path",
});
```

### Pattern 4: Events with Player and Country

```typescript
const fixture = await sportmonksClient.getFixtureById(18535517, {
  include: "events.player:display_name,image_path;events.player.country:name",
});
```

## Technical Notes

1. **Relation IDs**: Automatically included even when not selected (for technical reasons)
2. **Required Fields**: Some fields may be required and included automatically
3. **Invalid Fields**: Requesting non-existent fields may result in errors
4. **Compatibility**: Field selection works with all include types (nested, multiple, etc.)

## Examples in Our Codebase

### Optimized Fixture List

```typescript
// apps/web/src/app/api/sm/fixtures/date/route.ts
const fixtures = await sportmonksClient.getFixturesByDate(date, {
  select: "id,name,starting_at,state",
  include: "participants:name,short_code",
});
```

### Optimized Fixture Detail

```typescript
// apps/web/src/app/api/sm/fixtures/[fixtureId]/route.ts
const fixture = await sportmonksClient.getFixtureById(fixtureId, {
  select: "id,name,starting_at,state,result_info",
  include: "participants:name,short_code,image_path;events.player:display_name,image_path;lineups.player:display_name,image_path",
});
```

## Reference

- [SportMonks API Documentation](https://docs.sportmonks.com/v3)
- [Includes Guide](./includes-guide.md)
- [Syntax Examples](./syntax-examples.ts)

