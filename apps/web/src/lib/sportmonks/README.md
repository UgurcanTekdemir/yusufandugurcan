# SportMonks API Client - Best Practices

This directory contains the SportMonks API v3 client implementation following best practices for performance, rate limiting, and data optimization.

## API Syntax Reference

### Query Parameters

#### `select` - Field Selection
Select specific fields on the base entity to reduce response size and improve speed:

```typescript
// Select only name field (relation IDs included automatically for technical reasons)
await sportmonksClient.getFixtureById(18535517, {
  select: "name",
});

// Select multiple fields
await sportmonksClient.getFixturesByDate("2025-01-15", {
  select: "name,starting_at,state",
});

// Response example:
// {
//   "data": {
//     "name": "Celtic vs Rangers",
//     "id": 18535517,
//     "league_id": 501,  // Relation IDs included automatically
//     "season_id": 19735
//   }
// }
```

#### `include` - Include Relations
Include related data objects:
```typescript
// Include multiple relations (semicolon separates top-level includes)
await sportmonksClient.getFixtureById(12345, {
  include: "lineups;events;participants",
});

// Field selection inside includes (colon for entity, comma for fields)
await sportmonksClient.getFixtureById(12345, {
  include: "events:player_name,minute",
});

// Nested includes (dot notation for chaining)
await sportmonksClient.getFixtureById(12345, {
  include: "events.player.country:name",
});
```

#### `filters` - Filter Requests
Filter your request:
```typescript
// Single filter value
await sportmonksClient.getPrematchOdds(12345, {
  filters: "bookmakers:23",
});

// Multiple filter values (comma-separated)
await sportmonksClient.getFixtureById(12345, {
  filters: "eventTypes:14,18",
});

// Multiple filters (semicolon-separated)
await sportmonksClient.getPrematchOdds(12345, {
  filters: "bookmakers:23;markets:1,2,3",
});
```

### Syntax Operators

| Operator | Purpose | Example |
|----------|---------|---------|
| `,` (comma) | Separates multiple fields or IDs | `select=name,starting_at`<br>`filters=eventTypes:14,18` |
| `;` (semicolon) | Separates top-level includes | `include=lineups;events` |
| `:` (colon) | Field selection inside includes | `include=events:player_name,minute` |
| `.` (dot) | Nested relation chaining | `include=events.player.country:name` |

### Common Patterns

**Base field selection:**
```
?api_token=…&select=name,starting_at
```

**Including relations:**
```
?api_token=…&include=lineups,events
```

**Field filtering inside includes:**
```
?api_token=…&include=events:player_name,minute&filters=eventTypes:14,18
```

**Nested includes (multi-level):**
```
?api_token=…&include=events.player.country:name
```

## Features

### 1. Rate Limiting (`rateLimiter.ts`)
- **Token Bucket Algorithm**: Prevents 429 errors with client-side throttling
- **Automatic Backoff**: Handles 429 responses with exponential backoff and jitter
- **Retry-After Support**: Respects server-provided retry delays
- **Configuration**: Default 20 tokens burst, 1.5 tokens/sec (~90 req/min)

**Usage**: Automatically applied to all API calls via `smGet()`.

### 2. Reference Entity Cache (`referenceCache.ts`)
- **Cached Entities**: States, Types, Countries, Regions, Cities, Leagues, Teams
- **TTL**: 24 hours default (configurable)
- **Benefits**: Reduces includes, smaller payloads, faster responses

**Usage**:
```typescript
import { getCachedLeague, cacheLeague } from "@/lib/sportmonks/referenceCache";

// Check cache first
const league = getCachedLeague(leagueId);
if (!league) {
  // Fetch and cache
  const response = await fetchLeague(leagueId);
  cacheLeague(response);
}
```

### 3. Includes Parameter
The `include` parameter enriches API responses by including related resources in a single request, avoiding multiple API calls.

**Basic Usage**:
```typescript
// Include participants (teams) for a fixture
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "participants",
});

// Response includes participants array with team details:
// {
//   "data": {
//     "id": 19032598,
//     "name": "Spain vs England",
//     "participants": [
//       {
//         "id": 18645,
//         "name": "England",
//         "meta": { "location": "away", "winner": false }
//       },
//       {
//         "id": 18710,
//         "name": "Spain",
//         "meta": { "location": "home", "winner": true }
//       }
//     ]
//   }
// }
```

**Multiple Includes**:
```typescript
// Include multiple relations (semicolon-separated)
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "participants;league;venue",
});
```

**Field Selection in Includes**:
```typescript
// Include only specific fields from participants
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "participants:name,short_code,image_path",
});
```

**Nested Includes**:
```typescript
// Include nested relations (dot notation)
const fixture = await sportmonksClient.getFixtureById(19032598, {
  include: "participants.country:name",
});
```

### 3. Filters Support
All client methods now support `filters` parameter for optimization:

#### `filters=populate`
- Disables all includes
- Enables 1000 records per page (vs default 25)
- Minimal payload size
- **Best for**: Initial bulk data sync

```typescript
// Bulk fetch fixtures without includes
const fixtures = await sportmonksClient.getFixturesByDate("2025-01-15", {
  filters: "populate",
});
```

#### `filters=idAfter:12345`
- Fetches only records with ID > 12345
- **Best for**: Incremental sync after initial load

```typescript
// Incremental sync
const lastId = getMaxIdFromDb();
const newFixtures = await sportmonksClient.getFixturesByDate("2025-01-15", {
  filters: `populate;idAfter:${lastId}`,
});
```

#### `filters=page:2,per_page:100`
- Pagination support
- Combine with `populate` for efficient bulk fetching

```typescript
// Fetch page 2 with 100 records
const fixtures = await sportmonksClient.getFixturesByDate("2025-01-15", {
  filters: "populate;page:2,per_page:100",
});
```

## Best Practices

### 1. Initial Data Load Strategy

```typescript
// Step 1: Bulk load with populate filter
for (let page = 1; ; page++) {
  const response = await sportmonksClient.getFixturesByDate(date, {
    filters: `populate;page:${page},per_page:1000`,
  });
  
  if (!response.data || response.data.length === 0) break;
  
  // Save to database
  await saveToDb(response.data);
}
```

### 2. Incremental Sync Strategy

```typescript
// Step 2: Incremental sync loop
setInterval(async () => {
  const lastMaxId = getMaxIdFromDb();
  const response = await sportmonksClient.getFixturesByDate(date, {
    filters: `populate;idAfter:${lastMaxId}`,
  });
  
  if (response.data && response.data.length > 0) {
    await saveToDb(response.data);
  }
}, 60000); // Poll every minute
```

### 3. Reduce Includes with Caching

**Before** (inefficient):
```typescript
// Every request includes full league/team objects
const fixtures = await sportmonksClient.getFixturesByDate(date, {
  include: "participants;league;team",
});
```

**After** (optimized):
```typescript
// Fetch with minimal includes
const fixtures = await sportmonksClient.getFixturesByDate(date, {
  filters: "populate", // No includes
});

// Resolve league/team names from cache
fixtures.data.forEach((fixture) => {
  const league = getCachedLeague(fixture.league_id);
  const homeTeam = getCachedTeam(fixture.home_team_id);
  const awayTeam = getCachedTeam(fixture.away_team_id);
  // Use cached data instead of includes
});
```

### 4. Reference Entity Pre-loading

```typescript
// On app startup or daily cron job
async function preloadReferenceEntities() {
  // Fetch and cache all countries
  const countries = await fetch("/api/sm/reference?entity=countries");
  cacheAllCountries(countries.data);
  
  // Fetch and cache all states
  const states = await fetch("/api/sm/reference?entity=states");
  cacheAllStates(states.data);
  
  // Fetch and cache all types
  const types = await fetch("/api/sm/reference?entity=types");
  cacheAllTypes(types.data);
}
```

## API Endpoints

### `/api/sm/fixtures/date`
Supports new query parameters:
- `filters`: `populate`, `idAfter:12345`, `page:2,per_page:100`
- `select`: Select specific fields
- `locale`: Translation locale

**Example**:
```
GET /api/sm/fixtures/date?date=2025-01-15&filters=populate&per_page=1000
```

### `/api/sm/reference`
Fetch and cache reference entities:
- `entity`: `countries`, `states`, `types`
- `refresh`: `true` to force refresh cache

**Example**:
```
GET /api/sm/reference?entity=countries&refresh=true
```

## Monitoring

### Rate Limiter Stats
```typescript
import { getRateLimiter } from "@/lib/sportmonks/rateLimiter";

const limiter = getRateLimiter();
const tokens = limiter.getTokens(); // Current available tokens
```

### Cache Stats
```typescript
import { getCacheStats } from "@/lib/sportmonks/referenceCache";

const stats = getCacheStats();
console.log(`Cache size: ${stats.size}, Keys: ${stats.keys}`);
```

## Error Handling

### 429 Rate Limit Errors
Automatically handled with:
1. Exponential backoff (0.5s, 1s, 2s, 4s, max 8s)
2. Jitter to prevent synchronized retries
3. Retry-After header support
4. Maximum 3 retries

### Network Errors
- 15 second timeout
- Automatic retry on 429
- Detailed error logging (sanitized URLs)

## Performance Tips

1. **Use `filters=populate`** for bulk operations
2. **Cache reference entities** instead of using includes
3. **Use `idAfter`** for incremental sync
4. **Monitor cache hit rates** to optimize TTLs
5. **Batch requests** within rate limits
6. **Avoid over-including** - only request what you need

## Configuration

### Rate Limiter
Edit `rateLimiter.ts`:
```typescript
const DEFAULT_CONFIG: RateLimiterConfig = {
  maxTokens: 20,        // Burst capacity
  refillRate: 1.5,       // Tokens per second
  initialTokens: 20,     // Starting tokens
};
```

### Cache TTL
Edit `referenceCache.ts`:
```typescript
private readonly defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours
```

## References

- [SportMonks API v3 Documentation](https://docs.sportmonks.com/v3)
- [Best Practices Guide](https://docs.sportmonks.com/v3/best-practices)

