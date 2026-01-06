/**
 * Test script to fetch and list past match results from the API
 * Usage: node test-past-matches.js [days=7]
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function fetchPastMatches(days = 7) {
  const results = [];
  const today = new Date();
  
  console.log(`\n🔍 Fetching past match results for the last ${days} days...\n`);
  
  // Fetch fixtures for each day in the past
  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    try {
      console.log(`📅 Checking ${dateStr}...`);
      const response = await fetch(`${BASE_URL}/api/sm/fixtures/date?date=${dateStr}&include=participants:name,image_path;state;scores`);
      
      if (!response.ok) {
        console.log(`   ⚠️  API returned ${response.status}: ${response.statusText}`);
        continue;
      }
      
      const fixtures = await response.json();
      
      // Filter for finished matches only
      const finishedMatches = fixtures.filter(f => {
        // Check if match is finished based on isFinished flag or state
        return f.isFinished === true || 
               (f.state && ['FT', 'FT_PEN', 'CANCL', 'POSTP', 'INT', 'ABAN', 'SUSP', 'AWARDED'].includes(f.state.toUpperCase()));
      });
      
      if (finishedMatches.length > 0) {
        console.log(`   ✅ Found ${finishedMatches.length} finished match(es)`);
        results.push({
          date: dateStr,
          matches: finishedMatches
        });
      } else {
        console.log(`   ℹ️  No finished matches found`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Error fetching ${dateStr}:`, error.message);
    }
  }
  
  return results;
}

function formatMatchResult(match) {
  const homeTeam = match.homeTeam || match.teams?.home || 'N/A';
  const awayTeam = match.awayTeam || match.teams?.away || 'N/A';
  const score = match.score;
  const leagueName = match.leagueName || 'Unknown League';
  const kickoffAt = match.kickoffAt ? new Date(match.kickoffAt).toLocaleString('tr-TR') : 'N/A';
  
  let scoreStr = 'N/A';
  if (score && score.home !== undefined && score.away !== undefined) {
    scoreStr = `${score.home} - ${score.away}`;
  }
  
  return {
    fixtureId: match.fixtureId,
    league: leagueName,
    homeTeam,
    awayTeam,
    score: scoreStr,
    kickoffAt,
    state: match.state || 'FT'
  };
}

function displayResults(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PAST MATCH RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  if (results.length === 0) {
    console.log('❌ No finished matches found in the specified period.\n');
    return;
  }
  
  let totalMatches = 0;
  
  results.forEach(({ date, matches }) => {
    console.log(`\n📅 ${date} (${matches.length} match${matches.length > 1 ? 'es' : ''})`);
    console.log('-'.repeat(80));
    
    matches.forEach((match, index) => {
      const formatted = formatMatchResult(match);
      console.log(`\n${index + 1}. ${formatted.league}`);
      console.log(`   ${formatted.homeTeam} vs ${formatted.awayTeam}`);
      console.log(`   Score: ${formatted.score}`);
      console.log(`   Kickoff: ${formatted.kickoffAt}`);
      console.log(`   State: ${formatted.state}`);
      console.log(`   Fixture ID: ${formatted.fixtureId}`);
    });
    
    totalMatches += matches.length;
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`📈 Total: ${totalMatches} finished match${totalMatches !== 1 ? 'es' : ''} found`);
  console.log('='.repeat(80) + '\n');
  
  // Summary table
  console.log('\n📋 SUMMARY TABLE\n');
  console.log('Date'.padEnd(12) + 'League'.padEnd(30) + 'Match'.padEnd(40) + 'Score');
  console.log('-'.repeat(92));
  
  results.forEach(({ date, matches }) => {
    matches.forEach(match => {
      const formatted = formatMatchResult(match);
      const matchStr = `${formatted.homeTeam} vs ${formatted.awayTeam}`;
      const leagueStr = formatted.league.length > 28 ? formatted.league.substring(0, 25) + '...' : formatted.league;
      const matchStrShort = matchStr.length > 38 ? matchStr.substring(0, 35) + '...' : matchStr;
      
      console.log(
        date.padEnd(12) + 
        leagueStr.padEnd(30) + 
        matchStrShort.padEnd(40) + 
        formatted.score
      );
    });
  });
  
  console.log('\n');
}

async function main() {
  const days = parseInt(process.argv[2]) || 7;
  
  console.log('🚀 Starting past matches test...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📆 Days to check: ${days}\n`);
  
  try {
    const results = await fetchPastMatches(days);
    displayResults(results);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

